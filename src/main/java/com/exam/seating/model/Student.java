package com.exam.seating.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "students")
public class Student {

    @Id
    private String rollNo;
    private String name;
    private String branch;
    private int semester;
    private String subject;

    public Student() {}

    public Student(String rollNo, String name, String branch, int semester, String subject) {
        this.rollNo = rollNo;
        this.name = name;
        this.branch = branch;
        this.semester = semester;
        this.subject = subject;
    }

    public String getRollNo() { return rollNo; }
    public void setRollNo(String rollNo) { this.rollNo = rollNo; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public int getSemester() { return semester; }
    public void setSemester(int semester) { this.semester = semester; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
}
