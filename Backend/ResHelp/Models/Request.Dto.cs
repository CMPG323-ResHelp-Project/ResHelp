namespace ResHelp.Models
{
    public class RequestDto
    {
        // 🚨 CRITICAL FIX: Add a public parameterless constructor.
        // This is necessary for Google.Cloud.Firestore and ASP.NET Core 
        // to correctly create and populate the object instance.
        public RequestDto() { } 

        // Fields sent from the client (page.tsx)
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        
        public bool IsUrgent { get; set; } = false; 
        public string ReporterEmail { get; set; } = string.Empty; // Holds the user's email
        public int Rating { get; set; }
        public string Name { get; set; } = string.Empty; 
        public string Status { get; set; } = string.Empty; 
        public string Surname { get; set; } = string.Empty; 
        public string Id { get; set; } = string.Empty; 
        public string ReportedAt { get; set; } = string.Empty; 
        public string ReporterName {get; set; } = string.Empty;
    }
}