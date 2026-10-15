"""
Exam Seating Auto Allocator - Flask Backend Server
Provides REST APIs, SQLite persistence, and static file serving.
"""

import os
import sqlite3
import csv
import io
from flask import Flask, request, jsonify, send_file, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")
DB_FILE = "exam_seating.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS halls (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            rows INTEGER NOT NULL,
            cols INTEGER NOT NULL,
            seats_per_bench INTEGER NOT NULL DEFAULT 2,
            capacity INTEGER NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            roll_no TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            branch TEXT NOT NULL,
            semester INTEGER NOT NULL,
            subject TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS allocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seat_label TEXT NOT NULL,
            hall_id TEXT NOT NULL,
            row INTEGER NOT NULL,
            col INTEGER NOT NULL,
            bench_pos TEXT NOT NULL,
            roll_no TEXT NOT NULL,
            exam_date TEXT,
            exam_session TEXT,
            FOREIGN KEY (hall_id) REFERENCES halls (id),
            FOREIGN KEY (roll_no) REFERENCES students (roll_no)
        )
    """)
    conn.commit()
    conn.close()

# ----------------- Frontend Routes -----------------
@app.route("/")
def index():
    return send_from_directory(".", "index.html")

# ----------------- API: Halls -----------------
@app.route("/api/halls", methods=["GET"])
def get_halls():
    conn = get_db()
    halls = conn.execute("SELECT * FROM halls").fetchall()
    conn.close()
    return jsonify([dict(h) for h in halls])

@app.route("/api/halls", methods=["POST"])
def add_hall():
    data = request.json
    hall_id = data.get("id", "").strip().upper()
    name = data.get("name", "").strip()
    rows = int(data.get("rows", 5))
    cols = int(data.get("cols", 4))
    seats_per_bench = int(data.get("seats_per_bench", 2))
    capacity = rows * cols * seats_per_bench

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO halls (id, name, rows, cols, seats_per_bench, capacity) VALUES (?, ?, ?, ?, ?, ?)",
            (hall_id, name, rows, cols, seats_per_bench, capacity)
        )
        conn.commit()
        return jsonify({"message": f"Hall {hall_id} created successfully", "capacity": capacity}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": f"Hall with ID {hall_id} already exists"}), 400
    finally:
        conn.close()

@app.route("/api/halls/<hall_id>", methods=["DELETE"])
def delete_hall(hall_id):
    conn = get_db()
    conn.execute("DELETE FROM halls WHERE id = ?", (hall_id,))
    conn.execute("DELETE FROM allocations WHERE hall_id = ?", (hall_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": f"Hall {hall_id} deleted."})

# ----------------- API: Students -----------------
@app.route("/api/students", methods=["GET"])
def get_students():
    conn = get_db()
    students = conn.execute("SELECT * FROM students ORDER BY roll_no").fetchall()
    conn.close()
    return jsonify([dict(s) for s in students])

@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.json
    roll_no = data.get("roll_no", "").strip().upper()
    name = data.get("name", "").strip()
    branch = data.get("branch", "").strip().upper()
    semester = int(data.get("semester", 6))
    subject = data.get("subject", "").strip()

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO students (roll_no, name, branch, semester, subject) VALUES (?, ?, ?, ?, ?)",
            (roll_no, name, branch, semester, subject)
        )
        conn.commit()
        return jsonify({"message": f"Student {roll_no} registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": f"Student with Roll No {roll_no} already registered"}), 400
    finally:
        conn.close()

# ----------------- API: Auto Allocation -----------------
@app.route("/api/allocate", methods=["POST"])
def run_allocation():
    data = request.json or {}
    exam_date = data.get("date", "2026-10-20")
    session = data.get("session", "FN")

    conn = get_db()
    halls = conn.execute("SELECT * FROM halls").fetchall()
    students = conn.execute("SELECT * FROM students").fetchall()

    if not halls or not students:
        conn.close()
        return jsonify({"error": "Need at least one hall and registered students"}), 400

    # Group students by branch
    grouped = {}
    for s in students:
        b = s["branch"]
        grouped.setdefault(b, []).append(dict(s))

    # Interleave students across branches (Anti-cheating)
    queues = list(grouped.values())
    interleaved = []
    active = True
    while active:
        active = False
        for q in queues:
            if len(q) > 0:
                interleaved.append(q.pop(0))
                if len(q) > 0:
                    active = True

    # Clear previous allocations
    conn.execute("DELETE FROM allocations")

    allocations = []
    student_idx = 0
    total = len(interleaved)

    for h in halls:
        for r in range(1, h["rows"] + 1):
            for c in range(1, h["cols"] + 1):
                for pos in range(h["seats_per_bench"]):
                    if student_idx >= total:
                        break

                    st = interleaved[student_idx]
                    pos_char = "L" if pos == 0 else "R"
                    seat_label = f"{h['id']}-R{r}C{c}-{pos_char}"

                    conn.execute("""
                        INSERT INTO allocations (seat_label, hall_id, row, col, bench_pos, roll_no, exam_date, exam_session)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (seat_label, h["id"], r, c, pos_char, st["roll_no"], exam_date, session))

                    allocations.append({
                        "seat_label": seat_label,
                        "hall_id": h["id"],
                        "hall_name": h["name"],
                        "row": r,
                        "col": c,
                        "pos": pos_char,
                        "roll_no": st["roll_no"],
                        "name": st["name"],
                        "branch": st["branch"],
                        "subject": st["subject"]
                    })
                    student_idx += 1

    conn.commit()
    conn.close()
    return jsonify({
        "message": f"Successfully allocated {len(allocations)} students across {len(halls)} halls.",
        "allocated_count": len(allocations),
        "allocations": allocations
    })

@app.route("/api/allocations", methods=["GET"])
def get_allocations():
    conn = get_db()
    query = """
        SELECT a.seat_label, a.hall_id, h.name as hall_name, a.row, a.col, a.bench_pos,
               s.roll_no, s.name, s.branch, s.subject, a.exam_date, a.exam_session
        FROM allocations a
        JOIN halls h ON a.hall_id = h.id
        JOIN students s ON a.roll_no = s.roll_no
        ORDER BY a.hall_id, a.row, a.col, a.bench_pos
    """
    rows = conn.execute(query).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

if __name__ == "__main__":
    init_db()
    print("=" * 60)
    print(" Exam Seating Auto Allocator Server running on http://127.0.0.1:5000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=True)
