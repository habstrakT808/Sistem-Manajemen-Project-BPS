from locust import HttpUser, task, between

class ProjectManagementUser(HttpUser):
    wait_time = between(1, 3)
    host = "http://localhost:3000"  # Ganti dengan URL aplikasi Anda
    
    @task(3)
    def view_projects(self):
        self.client.get("/api/ketua-tim/projects")
    
    @task(2)
    def view_dashboard(self):
        self.client.get("/api/ketua-tim/dashboard")
    
    @task(2)
    def view_tasks(self):
        self.client.get("/api/pegawai/tasks")

