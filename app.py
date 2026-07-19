from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import re
import io
import os
from itertools import combinations
DEFAULT_MIN_SPLIT = 5

app = Flask(__name__)
# Restrict CORS to your deployed frontend once you have the Vercel URL, e.g.:
# CORS(app, origins=[os.environ.get("FRONTEND_URL", "*")])
CORS(app)

AUTH_USERNAME = os.environ.get('AUTH_USERNAME', 'demo-user')
AUTH_PASSWORD = os.environ.get('AUTH_PASSWORD', 'demo-pass')

YEARWISE_SHEETS = ['1st Year', '2nd Year', '3rd Year', '4th Year']


def room_sort_key(item):
    room_number, capacity = item
    match = re.match(r"([A-Za-z]+)-(\d+)", str(room_number))
    if match:
        block, number = match.groups()
        return (block, int(number), capacity)
    return ('Z', 9999, capacity)

def allocate_semester(room_df, dept_df, MIN_SPLIT):
    """
    Best-fit semester allocation with strict MIN_SPLIT rule.

    - Best-fit: pick the SMALLEST room whose capacity >= dept strength.
    - Co-location: after placing a dept, fill leftover with the largest other
      dept that fits entirely. That dept is marked processed immediately (no duplicate).
    - Split rule: place (strength - MIN_SPLIT) first, MIN_SPLIT in next iteration.
      No fragment ever < MIN_SPLIT.
    """
    room_df = room_df.copy()
    room_capacity_map = {str(r): int(c) for r, c in zip(room_df['Room_Number'], room_df['Capacity'])}

    dept_queue = list(
        dept_df[['Department', 'Total_Students']]
        .sort_values(by='Total_Students', ascending=False)
        .itertuples(index=False, name=None)
    )
    remaining = {d: int(s) for d, s in dept_queue}
    processed = set()
    dept_order = [d for d, _ in dept_queue]

    # available[room] = current available capacity
    available = dict(room_capacity_map)
    allocation = []

    def best_fit_room(strength):
        candidates = [(r, c) for r, c in available.items() if c >= strength]
        return min(candidates, key=lambda x: x[1]) if candidates else None

    def largest_room():
        return max(available.items(), key=lambda x: x[1]) if available else None

    def do_place(dept, strength, room):
        """
        Place `strength` students of `dept` into `room`.
        Updates available[], appends to allocation, and handles co-location ONCE.
        Returns nothing — caller should set strength=0 or subtract accordingly.
        """
        orig_cap = room_capacity_map[room]
        current_avail = available[room]

        # Sanity check
        actual = min(strength, current_avail)

        allocation.append({
            "Department": dept,
            "Room Allocated": room,
            "Allocated Strength": int(actual),
            "Room Capacity": int(orig_cap)
        })

        leftover = current_avail - actual

        # Update available ONCE
        if leftover > 0:
            available[room] = leftover
        else:
            del available[room]

        # Co-locate ONE other dept in leftover (if any)
        if leftover > 0:
            candidates = [
                (d, remaining[d]) for d in dept_order
                if d not in processed
                and d != dept
                and remaining[d] > 0
                and remaining[d] <= leftover
            ]
            if candidates:
                fill_dept, fill_str = max(candidates, key=lambda x: x[1])
                allocation.append({
                    "Department": fill_dept,
                    "Room Allocated": room,
                    "Allocated Strength": int(fill_str),
                    "Room Capacity": int(leftover)
                })
                remaining[fill_dept] = 0
                processed.add(fill_dept)
                leftover -= fill_str
                # Update available again after co-location
                if leftover > 0:
                    available[room] = leftover
                elif room in available:
                    del available[room]

        return actual

    for dept in dept_order:
        if dept in processed:
            continue

        strength = remaining[dept]

        while strength > 0:
            if not available:
                raise ValueError("Not enough rooms available.")

            fit = best_fit_room(strength)

            if fit:
                room, _ = fit
                do_place(dept, strength, room)
                strength = 0

            else:
                # Must split: part1 = strength - MIN_SPLIT, part2 = MIN_SPLIT (next iter)
                part1 = strength - MIN_SPLIT
                if part1 < MIN_SPLIT:
                    room, _ = largest_room()
                    placed = do_place(dept, strength, room)
                    strength -= placed
                else:
                    fit1 = best_fit_room(part1)
                    if fit1:
                        room, _ = fit1
                        do_place(dept, part1, room)
                        strength -= part1
                    else:
                        room, _ = largest_room()
                        placed = do_place(dept, part1, room)
                        strength -= placed

        remaining[dept] = 0
        processed.add(dept)

    allocation = add_unused_rooms(allocation, room_df)
    return allocation

def merge_small_allocations(allocation, min_size=5):
    from collections import defaultdict
    
    dept_map = defaultdict(list)

    for i, row in enumerate(allocation):
        dept_map[row["Department"]].append((i, row))

    to_remove = set()

    for dept, entries in dept_map.items():
        small = [(i, r) for i, r in entries if r["Allocated Strength"] < min_size]

        for s_idx, s_row in small:
            for l_idx, l_row in entries:
                if l_idx == s_idx:
                    continue

                spare = l_row["Room Capacity"] - l_row["Allocated Strength"]

                if spare >= s_row["Allocated Strength"]:
                    l_row["Allocated Strength"] += s_row["Allocated Strength"]
                    to_remove.add(s_idx)
                    break

    return [r for i, r in enumerate(allocation) if i not in to_remove]
def allocate_classtest(room_df, df1, df2, year1, year2, MIN_SPLIT):
    """
    Class-test allocation — two fixes:
    1. Year 1 is fully allocated first, THEN Year 2 uses remaining + partial rooms.
       No interleaving of years.
    2. Room Capacity shown in each row reflects the ACTUAL available capacity at
       the time of allocation (not always the original full capacity).
    3. Same smart best-fit + pairing + MIN_SPLIT split rule as semester.
    """
    df1 = df1.copy()
    df2 = df2.copy()
    df1['Department'] = df1['Department'] + f" ({year1})"
    df2['Department'] = df2['Department'] + f" ({year2})"

    total_capacity    = int(room_df['Capacity'].sum())
    combined_strength = int(df1['Total_Students'].sum()) + int(df2['Total_Students'].sum())
    if combined_strength > total_capacity:
        raise ValueError(
            f"Combined student strength ({combined_strength}) exceeds "
            f"total room capacity ({total_capacity})."
        )

    room_capacity_map = {str(r): int(c) for r, c in zip(room_df['Room_Number'], room_df['Capacity'])}
    # available tracks current free capacity per room
    available = dict(room_capacity_map)
    allocation = []

    def best_fit(strength):
        candidates = [(r, c) for r, c in available.items() if c >= strength]
        return min(candidates, key=lambda x: x[1]) if candidates else None

    def largest():
        return max(available.items(), key=lambda x: x[1]) if available else None

    def record(dept, strength, room, shown_cap):
        allocation.append({
            "Department": str(dept),
            "Room Allocated": str(room),
            "Allocated Strength": int(strength),
            "Room Capacity": int(shown_cap)       # actual available cap at time of placement
        })

    def consume(room, amount):
        available[room] = available[room] - amount
        if available[room] <= 0:
            available.pop(room, None)

    def find_best_pair(dept, strength, dept_list, processed):
        """Find another unprocessed dept to share one room with dept."""
        best = None
        best_waste = float('inf')
        for other_dept, other_str in dept_list:
            if other_dept in processed or other_dept == dept or other_str <= 0:
                continue
            combined = strength + other_str
            fit = best_fit(combined)
            if fit:
                room, cap = fit
                waste = cap - combined
                if waste < best_waste:
                    best_waste = waste
                    best = (other_dept, other_str, room, cap)
        return best

    def allocate_year(dept_list, processed):
        """
        Allocate all depts in dept_list using available rooms.
        dept_list: list of (dept_name, strength) sorted desc by strength.
        processed: shared set — depts placed via pairing are added here.
        """
        remaining = {d: int(s) for d, s in dept_list}
        order = [d for d, _ in dept_list]

        for dept in order:
            if dept in processed:
                continue

            strength = remaining[dept]

            while strength > 0:
                if not available:
                    raise ValueError(f"Not enough rooms for {dept}.")

                fit = best_fit(strength)

                if fit:
                    room, cap = fit

                    # Try pairing with another unprocessed dept from same year
                    unprocessed_pairs = [
                        (d, remaining[d]) for d in order
                        if d not in processed and d != dept and remaining[d] > 0
                    ]
                    pair = find_best_pair(dept, strength, unprocessed_pairs, processed)

                    if pair:
                        other_dept, other_str, pair_room, pair_cap = pair
                        pair_waste  = pair_cap - (strength + other_str)
                        solo_waste  = cap - strength
                        if pair_waste <= solo_waste:
                            avail_at_place = available[pair_room]
                            record(dept, strength, pair_room, avail_at_place)
                            consume(pair_room, strength)
                            leftover = available.get(pair_room, 0)
                            record(other_dept, other_str, pair_room,
                                   leftover if leftover > 0 else other_str)
                            consume(pair_room, other_str)
                            remaining[other_dept] = 0
                            processed.add(other_dept)
                            strength = 0
                            continue

                    # Place alone
                    avail_at_place = available[room]
                    record(dept, strength, room, avail_at_place)
                    consume(room, strength)
                    leftover = available.get(room, 0)

                    # Co-locate another dept in leftover if possible
                    if leftover > 0:
                        candidates = [
                            (d, remaining[d]) for d in order
                            if d not in processed and d != dept
                            and remaining[d] > 0 and remaining[d] <= leftover
                        ]
                        if candidates:
                            fill_dept, fill_str = max(candidates, key=lambda x: x[1])
                            record(fill_dept, fill_str, room, leftover)
                            consume(room, fill_str)
                            remaining[fill_dept] = 0
                            processed.add(fill_dept)

                    strength = 0

                else:
                    # Split: part1 = strength - MIN_SPLIT, part2 = MIN_SPLIT next iter
                    part1 = strength - MIN_SPLIT
                    if part1 < MIN_SPLIT:
                        room, cap = largest()
                        placed = min(strength, cap)
                        avail_at_place = available[room]
                        record(dept, placed, room, avail_at_place)
                        consume(room, placed)
                        strength -= placed
                    else:
                        fit1 = best_fit(part1)
                        if fit1:
                            room, _ = fit1
                            avail_at_place = available[room]
                            record(dept, part1, room, avail_at_place)
                            consume(room, part1)
                            leftover = available.get(room, 0)
                            if leftover > 0:
                                candidates = [
                                    (d, remaining[d]) for d in order
                                    if d not in processed and d != dept
                                    and remaining[d] > 0 and remaining[d] <= leftover
                                ]
                                if candidates:
                                    fill_dept, fill_str = max(candidates, key=lambda x: x[1])
                                    record(fill_dept, fill_str, room, leftover)
                                    consume(room, fill_str)
                                    remaining[fill_dept] = 0
                                    processed.add(fill_dept)
                            strength -= part1
                        else:
                            room, cap = largest()
                            avail_at_place = available[room]
                            placed = min(part1, cap)
                            record(dept, placed, room, avail_at_place)
                            consume(room, placed)
                            strength -= placed

            remaining[dept] = 0
            processed.add(dept)

    processed = set()

    # ── Year 1 first ──────────────────────────────────────────────────
    depts_y1 = list(
        df1[['Department', 'Total_Students']]
        .sort_values('Total_Students', ascending=False)
        .itertuples(index=False, name=None)
    )
    allocate_year(depts_y1, processed)

    # ── Year 2 next (uses remaining + partial rooms) ───────────────────
    depts_y2 = list(
        df2[['Department', 'Total_Students']]
        .sort_values('Total_Students', ascending=False)
        .itertuples(index=False, name=None)
    )
    allocate_year(depts_y2, processed)

    for row in allocation:
        row["Allocated Strength"] = int(row["Allocated Strength"])
        row["Room Capacity"]      = int(row["Room Capacity"])

    allocation = add_unused_rooms(allocation, room_df)
    return allocation

def add_unused_rooms(allocation, room_df):

    used_rooms = set()

    for a in allocation:
        used_rooms.add(a["Room Allocated"])

    for _, row in room_df.iterrows():

        room = str(row["Room_Number"])

        if room not in used_rooms:
            allocation.append({
                "Department": "Available for backlog/sickroom",
                "Room Allocated": room,
                "Allocated Strength": 0,
                "Room Capacity": int(row["Capacity"])
            })

    return allocation

@app.route('/api/preview-sheets', methods=['POST'])
def preview_sheets():
    try:
        room_file = request.files['room_data']
        dept_file = request.files['department_data']

        room_df = pd.read_excel(room_file)
        room_df['Room_Number'] = room_df['Room_Number'].astype(str)
        rooms = room_df[['Room_Number', 'Capacity']].to_dict(orient='records')

        departments = {}
        for year in YEARWISE_SHEETS:
            try:
                df = pd.read_excel(dept_file, sheet_name=year)
                dept_file.seek(0)
                departments[year] = df[['Department', 'Total_Students']].to_dict(orient='records')
            except Exception:
                dept_file.seek(0)
                departments[year] = []

        return jsonify({'rooms': rooms, 'departments': departments})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/authenticate', methods=['POST'])
def authenticate():
    data = request.get_json()
    if data.get('username') == AUTH_USERNAME and data.get('password') == AUTH_PASSWORD:
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401


@app.route('/api/best-combinations', methods=['POST'])
def best_combinations():
    try:
        room_file = request.files['room_data']
        dept_file = request.files['department_data']

        room_df = pd.read_excel(room_file)

        # Filter by selected rooms if provided
        selected_rooms_json = request.form.get('selected_rooms')
        if selected_rooms_json:
            import json
            selected_rooms = json.loads(selected_rooms_json)
            room_df['Room_Number'] = room_df['Room_Number'].astype(str)
            room_df = room_df[room_df['Room_Number'].isin(selected_rooms)]

        total_capacity = room_df['Capacity'].sum()

        year_strengths = {}
        selected_depts_json = request.form.get('selected_depts')
        selected_depts = json.loads(selected_depts_json) if selected_depts_json else {}

        for year in YEARWISE_SHEETS:
            df = pd.read_excel(dept_file, sheet_name=year)
            dept_file.seek(0)
            if year in selected_depts:
                df = df[df['Department'].isin(selected_depts[year])]
            year_strengths[year] = int(df['Total_Students'].sum())

        feasible = []
        years = list(year_strengths.keys())
        for i in range(len(years)):
            for j in range(i + 1, len(years)):
                total = year_strengths[years[i]] + year_strengths[years[j]]
                if total <= total_capacity:
                    remaining = int(total_capacity - total)
                    feasible.append({
                        'year1': years[i],
                        'year2': years[j],
                        'extra_seats': remaining,
                        'label': f"{years[i]} + {years[j]}  (Extra Seats: {remaining})"
                    })

        feasible.sort(key=lambda x: x['extra_seats'])
        return jsonify({'combinations': feasible})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/allocate/semester', methods=['POST'])
def allocate_semester_route():
    try:
        room_file = request.files['room_data']
        dept_file = request.files['department_data']
        sheet_name = request.form.get('sheet_name')

        room_df = pd.read_excel(room_file)
        dept_df = pd.read_excel(dept_file, sheet_name=sheet_name)
        min_split = int(request.form.get('min_split', DEFAULT_MIN_SPLIT))

        # Filter by selections if provided
        selected_rooms_json = request.form.get('selected_rooms')
        if selected_rooms_json:
            import json
            selected_rooms = json.loads(selected_rooms_json)
            room_df['Room_Number'] = room_df['Room_Number'].astype(str)
            room_df = room_df[room_df['Room_Number'].isin(selected_rooms)]

        selected_depts_json = request.form.get('selected_depts')
        if selected_depts_json:
            import json
            selected_depts = json.loads(selected_depts_json)
            if sheet_name in selected_depts:
                dept_df = dept_df[dept_df['Department'].isin(selected_depts[sheet_name])]

        allocation = allocate_semester(room_df, dept_df, min_split)
        return jsonify({'success': True, 'allocation': allocation, 'sheet': sheet_name})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/allocate/classtest', methods=['POST'])
def allocate_classtest_route():
    try:
        room_file = request.files['room_data']
        dept_file = request.files['department_data']
        year1 = request.form.get('year1')
        year2 = request.form.get('year2')

        room_df = pd.read_excel(room_file)
        df1 = pd.read_excel(dept_file, sheet_name=year1)
        dept_file.seek(0)
        df2 = pd.read_excel(dept_file, sheet_name=year2)
        min_split = int(request.form.get('min_split', DEFAULT_MIN_SPLIT))

        # Filter by selections if provided
        import json
        selected_rooms_json = request.form.get('selected_rooms')
        if selected_rooms_json:
            selected_rooms = json.loads(selected_rooms_json)
            room_df['Room_Number'] = room_df['Room_Number'].astype(str)
            room_df = room_df[room_df['Room_Number'].isin(selected_rooms)]

        selected_depts_json = request.form.get('selected_depts')
        if selected_depts_json:
            selected_depts = json.loads(selected_depts_json)
            if year1 in selected_depts:
                df1 = df1[df1['Department'].isin(selected_depts[year1])]
            if year2 in selected_depts:
                df2 = df2[df2['Department'].isin(selected_depts[year2])]

        allocation = allocate_classtest(room_df, df1, df2, year1, year2, min_split)
        return jsonify({'success': True, 'allocation': allocation, 'year1': year1, 'year2': year2})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/semester', methods=['POST'])
def export_semester():
    try:
        data = request.get_json()
        allocation = data['allocation']
        sheet_name = data['sheet_name']

        df = pd.DataFrame(allocation)

        df = df[
            [
                "Department",
                "Room Allocated",
                "Allocated Strength",
                "Room Capacity"
            ]
        ]

        output = io.BytesIO()

        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)

            worksheet = writer.sheets[sheet_name]
            worksheet.column_dimensions['A'].width = 30
            worksheet.column_dimensions['B'].width = 18
            worksheet.column_dimensions['C'].width = 18
            worksheet.column_dimensions['D'].width = 18

        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"{sheet_name}_Semester_Room_Allocation.xlsx"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/classtest', methods=['POST'])
def export_classtest():
    try:
        data = request.get_json()
        allocation = data['allocation']
        year1 = data['year1']
        year2 = data['year2']

        # Year-wise allocations
        data_y1 = [r for r in allocation if f"({year1})" in str(r['Department'])]
        data_y2 = [r for r in allocation if f"({year2})" in str(r['Department'])]

        # Unused rooms only
        unused_rooms = [
            r for r in allocation
            if r['Department'] == "Available for backlog/sickroom"
        ]

        output = io.BytesIO()

        with pd.ExcelWriter(output, engine='openpyxl') as writer:

            df1 = pd.DataFrame(data_y1)[
                ["Department", "Room Allocated", "Allocated Strength", "Room Capacity"]
            ]

            df2 = pd.DataFrame(data_y2)[
                ["Department", "Room Allocated", "Allocated Strength", "Room Capacity"]
            ]

            if unused_rooms:
                df_unused = pd.DataFrame(unused_rooms)[["Room Allocated", "Room Capacity"]]
            else:
                df_unused = pd.DataFrame(columns=["Room Allocated", "Room Capacity"])

            # Write sheets
            df1.to_excel(writer, sheet_name=year1, index=False)
            df2.to_excel(writer, sheet_name=year2, index=False)
            df_unused.to_excel(writer, sheet_name="Unused Rooms", index=False)

            # Column formatting
            for sheet in [year1, year2]:
                ws = writer.sheets[sheet]
                ws.column_dimensions['A'].width = 30
                ws.column_dimensions['B'].width = 18
                ws.column_dimensions['C'].width = 18
                ws.column_dimensions['D'].width = 18

            ws_unused = writer.sheets["Unused Rooms"]
            ws_unused.column_dimensions['A'].width = 20
            ws_unused.column_dimensions['B'].width = 18

        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"ClassTest_Room_Allocation_{year1}_{year2}.xlsx"
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500



import random
import re as _re

SECURITY_QUESTIONS = [
    {
        "id": 1,
        "question": os.environ.get("SECQ1_QUESTION", "What is the name of your organization?"),
        "answer": os.environ.get("SECQ1_ANSWER", "demo organization"),
    },
    {
        "id": 2,
        "question": os.environ.get("SECQ2_QUESTION", "What is the office room number?"),
        "answer": os.environ.get("SECQ2_ANSWER", "101"),
    },
    {
        "id": 3,
        "question": os.environ.get("SECQ3_QUESTION", "What year was the office established?"),
        "answer": os.environ.get("SECQ3_ANSWER", "2000"),
    },
]

def _normalize(qid, raw):
    raw = raw.strip()
    if qid == 1:
        return raw.lower()
    elif qid == 2:
        return _re.sub(r'[^0-9]', '', raw)
    elif qid == 3:
        return raw.strip()
    return raw.lower()

def _check(qid, raw):
    got      = _normalize(qid, raw)
    expected = _normalize(qid, SECURITY_QUESTIONS[qid - 1]["answer"])
    return got == expected


@app.route('/api/forgot-password/question', methods=['GET'])
def get_security_question():
    q = random.choice(SECURITY_QUESTIONS)
    return jsonify({"id": q["id"], "question": q["question"]})


@app.route('/api/forgot-password/verify', methods=['POST'])
def verify_security_answer():
    data   = request.get_json()
    qid    = int(data.get("id", 0))
    answer = data.get("answer", "")
    if _check(qid, answer):
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Incorrect answer."}), 200


@app.route('/api/forgot-password/reset', methods=['POST'])
def reset_password():
    global AUTH_PASSWORD
    data         = request.get_json()
    qid          = int(data.get("id", 0))
    answer       = data.get("answer", "")
    new_password = data.get("new_password", "")

    if not _check(qid, answer):
        return jsonify({"success": False, "message": "Verification failed."}), 200
    if not new_password or len(new_password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 200

    AUTH_PASSWORD = new_password
    return jsonify({"success": True})
@app.route("/")
def home():
    return "Backend is running successfully"

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
