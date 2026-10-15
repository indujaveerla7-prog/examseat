package com.exam.seating;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;

/**
 * ExamSeatingApp - Pure Java Standalone Server
 * Runs out of the box with standard JDK (Java 8/11/17/21).
 * Zero external JAR dependencies required to compile or run!
 */
public class ExamSeatingApp {

    public static class Student {
        public String rollNo;
        public String name;
        public String branch;
        public int semester;
        public String subject;

        public Student(String rollNo, String name, String branch, int semester, String subject) {
            this.rollNo = rollNo;
            this.name = name;
            this.branch = branch;
            this.semester = semester;
            this.subject = subject;
        }
    }

    public static class Hall {
        public String id;
        public String name;
        public int rows;
        public int cols;
        public int seatsPerBench;
        public int capacity;

        public Hall(String id, String name, int rows, int cols, int seatsPerBench) {
            this.id = id;
            this.name = name;
            this.rows = rows;
            this.cols = cols;
            this.seatsPerBench = seatsPerBench;
            this.capacity = rows * cols * seatsPerBench;
        }
    }

    public static class Allocation {
        public String seatLabel;
        public String hallId;
        public String hallName;
        public int row;
        public int col;
        public String pos;
        public String studentRoll;
        public String studentName;
        public String branch;
        public String subject;

        public Allocation(String seatLabel, String hallId, String hallName, int row, int col,
                          String pos, String studentRoll, String studentName, String branch, String subject) {
            this.seatLabel = seatLabel;
            this.hallId = hallId;
            this.hallName = hallName;
            this.row = row;
            this.col = col;
            this.pos = pos;
            this.studentRoll = studentRoll;
            this.studentName = studentName;
            this.branch = branch;
            this.subject = subject;
        }
    }

    public static List<Hall> getSampleHalls() {
        List<Hall> list = new ArrayList<>();
        list.add(new Hall("HALL-101", "Main Auditorium (Room 101)", 6, 4, 2));
        list.add(new Hall("HALL-102", "Science Block (Room 201)", 5, 4, 2));
        list.add(new Hall("HALL-103", "Engineering Wing (Room 301)", 4, 4, 2));
        return list;
    }

    public static List<Student> getSampleStudents() {
        List<Student> list = new ArrayList<>();
        String[] branches = {"CSE", "ECE", "MECH", "CIVIL"};
        String[] subjects = {
            "CS601 - Database Systems",
            "EC601 - Embedded Systems",
            "ME601 - Machine Design",
            "CE601 - Structural Analysis"
        };

        for (int b = 0; b < branches.length; b++) {
            String br = branches[b];
            String sub = subjects[b];
            for (int i = 1; i <= 15; i++) {
                String roll = String.format("21%s%03d", br.substring(0, 2), i);
                list.add(new Student(roll, "Candidate " + roll, br, 6, sub));
            }
        }
        return list;
    }

    /**
     * Core Anti-Cheating Round-Robin Interleave Allocation in Pure Java
     */
    public static List<Allocation> allocateSeats(List<Hall> halls, List<Student> students) {
        // Group by branch
        Map<String, List<Student>> branchMap = new LinkedHashMap<>();
        for (Student s : students) {
            branchMap.computeIfAbsent(s.branch, k -> new ArrayList<>()).add(s);
        }

        // Round robin interleave
        List<List<Student>> queues = new ArrayList<>();
        for (List<Student> q : branchMap.values()) {
            queues.add(new ArrayList<>(q));
        }

        List<Student> interleaved = new ArrayList<>();
        boolean active = true;
        while (active) {
            active = false;
            for (List<Student> q : queues) {
                if (!q.isEmpty()) {
                    interleaved.add(q.remove(0));
                    if (!q.isEmpty()) active = true;
                }
            }
        }

        List<Allocation> results = new ArrayList<>();
        int studentIdx = 0;
        int total = interleaved.size();

        for (Hall hall : halls) {
            for (int r = 1; r <= hall.rows; r++) {
                for (int c = 1; c <= hall.cols; c++) {
                    for (int pos = 0; pos < hall.seatsPerBench; pos++) {
                        if (studentIdx >= total) return results;

                        Student s = interleaved.get(studentIdx);
                        String posChar = (pos == 0) ? "L" : "R";
                        String seatLabel = String.format("%s-R%dC%d-%s", hall.id, r, c, posChar);

                        results.add(new Allocation(
                            seatLabel, hall.id, hall.name, r, c, posChar,
                            s.rollNo, s.name, s.branch, s.subject
                        ));
                        studentIdx++;
                    }
                }
            }
        }
        return results;
    }

    public static void main(String[] args) throws Exception {
        int port = 8080;
        com.sun.net.httpserver.HttpServer server = com.sun.net.httpserver.HttpServer.create(new InetSocketAddress(port), 0);

        List<Hall> halls = getSampleHalls();
        List<Student> students = getSampleStudents();
        List<Allocation> allocations = allocateSeats(halls, students);

        // Simple static file handler
        server.createContext("/", exchange -> {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) path = "/index.html";

            File file = new File("." + path);
            if (!file.exists()) {
                file = new File("./src/main/resources/static" + path);
            }

            if (file.exists() && !file.isDirectory()) {
                String contentType = "text/plain";
                if (path.endsWith(".html")) contentType = "text/html; charset=UTF-8";
                else if (path.endsWith(".css")) contentType = "text/css; charset=UTF-8";
                else if (path.endsWith(".js")) contentType = "application/javascript; charset=UTF-8";

                byte[] bytes = Files.readAllBytes(file.toPath());
                exchange.getResponseHeaders().set("Content-Type", contentType);
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            } else {
                String notFound = "404 Not Found";
                exchange.sendResponseHeaders(404, notFound.length());
                OutputStream os = exchange.getResponseBody();
                os.write(notFound.getBytes());
                os.close();
            }
        });

        server.setExecutor(null);
        server.start();

        System.out.println("==================================================================");
        System.out.println(" 🎓 Exam Seating Auto Allocator - Full-Stack Java Standalone Server");
        System.out.println(" Running on: http://localhost:" + port);
        System.out.println(" Press Ctrl+C to stop.");
        System.out.println("==================================================================");
    }
}
