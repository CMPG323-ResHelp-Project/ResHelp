using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;


// === Create builder ===
var builder = WebApplication.CreateBuilder(args);

// === Firebase & Firestore setup ===
string dir = AppContext.BaseDirectory;
//string serviceAccountPath = Path.GetFullPath(Path.Combine(dir, @"..\..\..\reshelp-ba48b-firebase-adminsdk-fbsvc-68be648d8b.json"));
string serviceAccountPath = Path.GetFullPath(Path.Combine(dir, @"..\..\..\reshelp2-firebase-adminsdk-fbsvc-61fc2167c8.json"));

// Initialize Firebase Admin
var firebaseApp = FirebaseApp.Create(new AppOptions
{
    Credential = GoogleCredential.FromFile(serviceAccountPath)
});

// Set environment variable for Firestore SDK
Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", serviceAccountPath);
var firestoreDb = FirestoreDb.Create("reshelp2");

// === Register services ===
builder.Services.AddSingleton(firestoreDb);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// === Configure CORS ===
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// === Build app ===
var app = builder.Build();

// === Middleware ===
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

app.MapControllers();
app.Run();
