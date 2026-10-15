"""
Exam Seating Auto Allocator - Core Allocation Engine (Python CLI)
Automates hall and seat assignments with anti-cheating interleaved logic.
"""

import csv
import json
import os
import sys
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional

@dataclass
class Student:
    roll_no: str
    name: str
    branch: str
    semester: int
    subject: str

@dataclass
class Hall:
    id: str
    name: str
    rows: int
    cols: int
    seats_per_bench: int = 2

    @property
    def capacity(self) -> int:
        return self.rows * self.cols * self.seats_per_bench

@dataclass
class SeatAllocation:
    seat_label: str
    hall_id: str
    hall_name: str
    row: int
    col: int
    bench_label: str
    bench_position: str  # 'L' or 'R'
    student_roll: str
    student_name: str
    branch: str
    subject: str

class ExamSeatingAllocator:
    def __init__(self, halls: List[Hall]):
        self.halls = halls

    @property
    def total_capacity(self) -> int:
        return sum(h.capacity for h in self.halls)

    def interleave_students(self, students: List[Student]) -> List[Student]:
        """
        Anti-Cheating Strategy:
        Partitions students by branch/subject, then performs round-robin interleaving
        so that neighboring students on the same bench or consecutive seats
        belong to different departments.
        """
        grouped: Dict[str, List[Student]] = {}
        for s in students:
            grouped.setdefault(s.branch, []).append(s)

        branch_queues = [list(queue) for queue in grouped.values()]
        interleaved: List[Student] = []

        active = True
        while active:
            active = False
            for q in branch_queues:
                if len(q) > 0:
                    interleaved.append(q.pop(0))
                    if len(q) > 0:
                        active = True

        return interleaved

    def allocate(self, students: List[Student]) -> List[SeatAllocation]:
        """
        Assigns interleaved students to halls, benches, and seats.
        """
        interleaved = self.interleave_students(students)
        allocations: List[SeatAllocation] = []

        student_idx = 0
        total_students = len(interleaved)

        for hall in self.halls:
            for r in range(1, hall.rows + 1):
                for c in range(1, hall.cols + 1):
                    for pos in range(hall.seats_per_bench):
                        if student_idx >= total_students:
                            return allocations

                        student = interleaved[student_idx]
                        pos_char = "L" if pos == 0 else "R"
                        seat_label = f"{hall.id}-R{r}C{c}-{pos_char}"
                        bench_label = f"Row {r}, Col {c}"

                        allocations.append(
                            SeatAllocation(
                                seat_label=seat_label,
                                hall_id=hall.id,
                                hall_name=hall.name,
                                row=r,
                                col=c,
                                bench_label=bench_label,
                                bench_position=pos_char,
                                student_roll=student.roll_no,
                                student_name=student.name,
                                branch=student.branch,
                                subject=student.subject,
                            )
                        )
                        student_idx += 1

        return allocations

    def export_csv(self, allocations: List[SeatAllocation], filepath: str):
        """Exports allocations to a CSV spreadsheet."""
        with open(filepath, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Seat_Label", "Hall_ID", "Hall_Name", "Row", "Column",
                "Bench_Position", "Roll_Number", "Student_Name", "Branch", "Subject"
            ])
            for a in allocations:
                writer.writerow([
                    a.seat_label, a.hall_id, a.hall_name, a.row, a.col,
                    a.bench_position, a.student_roll, a.student_name, a.branch, a.subject
                ])

    def print_ascii_summary(self, allocations: List[SeatAllocation]):
        """Prints formatted terminal overview."""
        print("=" * 80)
        print("          EXAM SEATING AUTO ALLOCATOR - SUMMARY REPORT")
        print("=" * 80)
        print(f"Total Halls Configured : {len(self.halls)} ({self.total_capacity} seats)")
        print(f"Total Seats Allocated  : {len(allocations)}")
        print("-" * 80)

        # Hall by hall summary
        for hall in self.halls:
            hall_allocs = [a for a in allocations if a.hall_id == hall.id]
            print(f"\n[+] {hall.name} ({hall.id}) - {len(hall_allocs)} / {hall.capacity} seats filled")
            print(f"    Grid: {hall.rows} rows x {hall.cols} cols | {hall.seats_per_bench} seats/bench")
            
            # Print sample seating rows
            for r in range(1, min(hall.rows + 1, 4)):
                row_str = f"    Row {r}: "
                row_allocs = [a for a in hall_allocs if a.row == r]
                items = [f"[{a.student_roll}:{a.branch}]" for a in row_allocs[:6]]
                print(row_str + " ".join(items))
            if hall.rows > 3:
                print(f"    ... and {hall.rows - 3} more rows.")

        print("\n" + "=" * 80)

def load_students_from_csv(filepath: str) -> List[Student]:
    students = []
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Flexible column headers
            roll = row.get("Roll_Number") or row.get("roll_no") or row.get("Roll No")
            name = row.get("Student_Name") or row.get("name") or row.get("Name")
            branch = row.get("Branch") or row.get("branch") or row.get("Department")
            sem = row.get("Semester") or row.get("sem") or 6
            subj = row.get("Subject") or row.get("subject") or "Core Exam"

            if roll:
                students.append(Student(
                    roll_no=roll.strip(),
                    name=name.strip() if name else "Student",
                    branch=branch.strip().upper() if branch else "GEN",
                    semester=int(sem),
                    subject=subj.strip() if subj else "General Paper"
                ))
    return students

if __name__ == "__main__":
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "sample_students.csv"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "allocated_seating_plan.csv"

    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found. Please provide a valid CSV student roster.")
        sys.exit(1)

    # Standard default examination halls
    halls = [
        Hall(id="HALL-101", name="Auditorium (Room 101)", rows=6, cols=4, seats_per_bench=2),
        Hall(id="HALL-102", name="Science Block (Room 201)", rows=5, cols=4, seats_per_bench=2),
        Hall(id="HALL-103", name="Engineering Wing (Room 301)", rows=4, cols=4, seats_per_bench=2)
    ]

    print(f"Loading students from '{csv_file}'...")
    students = load_students_from_csv(csv_file)
    print(f"Loaded {len(students)} student records.")

    allocator = ExamSeatingAllocator(halls)
    allocations = allocator.allocate(students)
    allocator.export_csv(allocations, output_file)
    allocator.print_ascii_summary(allocations)
    print(f"Seating plan saved to '{output_file}' successfully!")
