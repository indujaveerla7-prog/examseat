package com.exam.seating.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "halls")
public class Hall {

    @Id
    private String id;
    private String name;

    @Column(name = "hall_rows")
    private int rows;

    @Column(name = "hall_cols")
    private int cols;

    private int seatsPerBench;
    private int capacity;

    public Hall() {}

    public Hall(String id, String name, int rows, int cols, int seatsPerBench) {
        this.id = id;
        this.name = name;
        this.rows = rows;
        this.cols = cols;
        this.seatsPerBench = seatsPerBench;
        this.capacity = rows * cols * seatsPerBench;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getRows() { return rows; }
    public void setRows(int rows) { 
        this.rows = rows; 
        this.capacity = this.rows * this.cols * this.seatsPerBench;
    }

    public int getCols() { return cols; }
    public void setCols(int cols) { 
        this.cols = cols; 
        this.capacity = this.rows * this.cols * this.seatsPerBench;
    }

    public int getSeatsPerBench() { return seatsPerBench; }
    public void setSeatsPerBench(int seatsPerBench) { 
        this.seatsPerBench = seatsPerBench; 
        this.capacity = this.rows * this.cols * this.seatsPerBench;
    }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }
}
