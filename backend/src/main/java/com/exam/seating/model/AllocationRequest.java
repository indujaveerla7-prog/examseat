package com.exam.seating.model;

public class AllocationRequest {
    private String date = "2026-10-20";
    private String session = "FN";
    private String interleaveStrategy = "BRANCH_ALTERNATE";

    public AllocationRequest() {}

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getSession() { return session; }
    public void setSession(String session) { this.session = session; }

    public String getInterleaveStrategy() { return interleaveStrategy; }
    public void setInterleaveStrategy(String interleaveStrategy) { this.interleaveStrategy = interleaveStrategy; }
}
