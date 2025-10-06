# 🚀 Resource Allocator

> **A smart way to plan, allocate, and track your team’s time across projects with logic that actually understands people.**

---

## 🧭 Overview

**Resource Allocator** is a lightweight workforce planning tool built to help project managers and team leads distribute work efficiently across multiple initiatives.  
It ensures that no one is overbooked, that hours are allocated fairly, and that every project gets the attention it deserves all through an intuitive, data-driven interface.

This tool isn’t just another tracker it’s a **living planner** that understands availability, roles, and capacity in real time.

---

## 💡 What It Does

- **Smart Auto-Allocation**  
  Automatically distributes project hours across available team members based on their role and workload.

- **Capacity-Aware Planning**  
  Prevents allocations beyond daily working limits (6.5 hours soft cap).  
  Auto-skips weekends and unavailable dates.

- **Role-Based Visualization**  
  Group people by roles (PM, Developer, Designer, Tester, etc.) and see how many hours are planned or left.

- **Initiative Management**  
  Create, view, and manage multiple projects with distinct start and end dates.

- **Daily Huddle View**  
  A single-day snapshot showing who’s working on what, and how much of their capacity is used.

- **Editable Allocations**  
  Update planned hours directly from the interface — everything syncs in real time.

- **Actual vs Planned Logging**  
  Log actual hours spent per person per project to compare and adjust future planning.

- **Seamless Integration**  
  Works with Supabase (PostgreSQL) backend and Material UI frontend for a responsive, elegant experience.

---

## 👩‍💼 Why It Exists

Managing resources across projects often feels chaotic — spreadsheets, constant updates, mismatched data between PMs and team members.  
**Resource Allocator** was built to fix that.

It’s simple, visual, and smart.  
It understands when a person is overloaded, automatically balances time, and makes your planning meetings faster and fairer.

---

## 🧠 Key Highlights

- 🧩 Automatic allocation engine with live preview before applying  
- 📊 Real-time view of every person’s workload  
- ⏰ Built-in time validation (no overbooking)  
- 🔄 Auto-adjustment logic for actual vs planned time *(coming soon)*  
- 🌈 Clean, modern UI built with React + Material UI  
- ☁️ Powered by Supabase for instant sync between frontend & database  

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React + TypeScript + Material UI |
| **Backend** | Supabase (PostgreSQL + RPC functions) |
| **Deployment** | Vercel |
| **State Management** | React Hooks |
| **Data Flow** | REST / Supabase RPC |

---

## 🎯 Who It’s For

- **Project Managers** who need visibility across multiple initiatives  
- **Developers** who want transparency in allocation  
- **Leads & Coordinators** balancing capacity and deadlines  
- **Organizations** running agile or hybrid projects  

---

## ⚙️ Core Modules

| Module | Description |
|---------|-------------|
| 🧍‍♂️ **People** | Add, view, and manage team members with defined roles |
| 🧩 **Initiatives** | Create and configure projects with start & end dates |
| 📊 **Role Demand** | Define required hours for each role in a project |
| ⚡ **Auto Allocate** | Automatically distribute work among team members |
| 📅 **Daily Huddle** | Review allocations for the day and update easily |
| 🕓 **Actual Logging** | Record actual hours spent and sync future plans |

---

## 📈 Current Phase — *Sprint 1 Completed ✅*

The foundation is ready full-fledged auto allocation, initiative management, role grouping, and capacity control.

### ✅ Sprint 1 Highlights

| Feature | Description |
|----------|-------------|
| **Auto Allocation Engine** | Dynamically allocates people to initiatives based on availability and role |
| **People & Role Management** | Centralized list of all team members categorized by their roles |
| **Initiative Setup** | Ability to create, update, and view multiple initiatives |
| **Huddle Page** | Daily view of who’s working on what, editable hours, and soft capacity alerts |
| **Actual Logging** | Record real worked hours for each person per project |
| **Capacity Rules** | Automatically prevents allocations beyond 6.5 hours/day |
| **Backend RPC Logic** | Supabase-backed procedures to handle preview, allocation, and roll-up logic |
| **Deployment** | Fully hosted and live on Vercel |

---

## 🧩 Upcoming (Sprint 2 Roadmap)

> *(Hidden by default — future enhancements include)*  
> - Roll-forward adjustment when actual hours differ from planned  
> - Waterfall model integration  
> - Color-coded project visualization  
> - Initiative deletion logic and auto-freeing allocations  
> - Advanced availability dashboard  

---

## 👥 Contributors

| Name | Role |
|------|------|
| **Tatha** | Product Lead & Full-Stack Developer |


---

## 🌍 Live Deployment

🔗 **Live on Vercel** → [[Allocate your resource](https://resource-allocator-eight.vercel.app/)](#)

---

## ❤️ Vision

> “A tool that respects time because people aren’t just resources.”

---
