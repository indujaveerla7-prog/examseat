package com.exam.seating.model;

import jakarta.persistence.*;

@Entity
@Table(name = "allocations")
public class Allocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String seatLabel;
    private String hallId;
    private String hallName;
    private int rowNum;
    private int colNum;
    private String seatPos; // "A" or "B"
    private String benchLabel;

    private String studentRoll;
    private String studentName;
    private String branch;
    private String subject;

    private String examDate;
    private String examSession;

    public Allocation() {}

    public Allocation(String seatLabel, String hallId, String hallName, int rowNum, int colNum,
                      String seatPos, String benchLabel, String studentRoll, String studentName,
                      String branch, String subject, String examDate, String examSession) {
        this.seatLabel = seatLabel;
        this.hallId = hallId;
        this.hallName = hallName;
        this.rowNum = rowNum;
        this.colNum = colNum;
        this.seatPos = seatPos;
        this.benchLabel = benchLabel;
        this.studentRoll = studentRoll;
        this.studentName = studentName;
        this.branch = branch;
        this.subject = subject;
        this.examDate = examDate;
        this.examSession = examSession;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSeatLabel() { return seatLabel; }
    public void setSeatLabel(String seatLabel) { this.seatLabel = seatLabel; }

    public String getHallId() { return hallId; }
    public void setHallId(String hallId) { this.hallId = hallId; }

    public String getHallName() { return hallName; }
    public void setHallName(String hallName) { this.hallName = hallName; }

    public int getRowNum() { return rowNum; }
    public void setRowNum(int rowNum) { this.rowNum = rowNum; }

    public int getColNum() { return colNum; }
    public void setColNum(int colNum) { this.colNum = colNum; }

    public String getSeatPos() { return seatPos; }
    public void setSeatPos(String seatPos) { this.seatPos = seatPos; }

    public String getBenchLabel() { return benchLabel; }
    public void setBenchLabel(String benchLabel) { this.benchLabel = benchLabel; }

    public String getStudentRoll() { return studentRoll; }
    public void setStudentRoll(String studentRoll) { this.studentRoll = studentRoll; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getExamDate() { return examDate; }
    public void setExamDate(String examDate) { this.examDate = examDate; }

    public String getExamSession() { return examSession; }
    public void setExamSession(String examSession) { this.examSession = examSession; }
}
