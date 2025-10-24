
# 🛠️ ResHelp – Maintenance Management System

**ResHelp** is a full-stack maintenance management platform designed to simplify maintenance reporting and tracking for students, staff, and managers.

## 🚀 Features
- 🧑‍🎓 Students can log and track maintenance issues  
- 🧑‍🔧 Staff can view, update, and resolve assigned tasks  
- 👩‍💼 Managers can view analytics and generate reports  
- 🔔 Real-time notifications for updates and new issues  

## ⚙️ Requirements
Before running, make sure you have installed:
- [Node.js](https://nodejs.org/) (v18 or later)
- [.NET SDK 8.0+](https://dotnet.microsoft.com/en-us/download)
- npm (comes with Node.js)
- SQL Server (local or hosted)

---

## 🧩 Project Setup

### 1️⃣ Install Frontend Dependencies
```bash
cd Frontend/maintenance-system
npm install
````

### 2️⃣ Restore Backend Dependencies

```bash
cd Backend/ResHelp
dotnet restore
```

---

## 🚀 How to Run the Whole Project (Backend + Frontend)

👉 At the **root of your project**, you’ll find a file called:

```
run-app.js
```

This script automatically:

* Starts the **.NET backend**
* Builds and launches the **Next.js frontend**

---

### ✅ To start everything at once:

```bash
  node start.js
```



* The backend will start automatically (`dotnet run`)
* The frontend will build and run (`npm run build` → `npm run start`)
* You can visit the site at **[http://localhost:3000](http://localhost:3000)**


## 🧠 Troubleshooting

| Issue                  | Possible Fix                                                |
| ---------------------- | ----------------------------------------------------------- |
| ❌ `Failed to fetch`    | Make sure backend is running and API URL matches.           |
| ⚠️ Port already in use | Stop other apps using port 3000 or 5000.                    |
| 🧱 Build failed        | Run `npm install` again and rebuild with `node run-app.js`. |



