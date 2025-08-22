using FirebaseAdmin; // Firebase Admin SDK
using FirebaseAdmin.Auth; // Firebase Authentication
using Google.Apis.Auth.OAuth2; // Google Auth Library, default package
using Google.Cloud.Firestore; // Firestore SDK
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;
using System.Net.Http.Headers;


var builder = WebApplication.CreateBuilder(args);

// Firebase and Firestore Services 
var firebaseCredentialsPath = Path.Combine(Directory.GetCurrentDirectory(), "res-help-firebase-adminsdk-fbsvc-b0a0e05ce7.json"); //the file you downloaded from our Firebase

var firebaseApp = FirebaseApp.Create(new AppOptions()
{
    Credential = GoogleCredential.FromFile(firebaseCredentialsPath)
});

var firestoreDb = FirestoreDb.Create("<\r\nres-help>");

//Configure Dependency Injection


// Services that our controllers will use.
builder.Services.AddSingleton(firestoreDb);
builder.Services.AddScoped<FirebaseAuthorizationFilter>(); // This will handle Firebase token validation for our controllers
builder.Services.AddControllers();


// Add services for API endpoints.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

//for authentication and authorization.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();


//This is the Firebase Authorization Filter that will validate the Firebase ID token in incoming requests. Not yet complete as the db is not yet injected.
public class FirebaseAuthorizationFilter : IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var request = context.HttpContext.Request;  // Incoming HTTP request from the frontend
        if (!request.Headers.ContainsKey("Authorization"))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        string authHeader = request.Headers["Authorization"]; //Authorization header value
        if (!AuthenticationHeaderValue.TryParse(authHeader, out var headerValue) || headerValue.Scheme != "Bearer" || string.IsNullOrEmpty(headerValue.Parameter))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var idToken = headerValue.Parameter;

        try
        {
            FirebaseToken decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken); // Verify the token using Firebase Admin SDK
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, decodedToken.Uid),
                new Claim(ClaimTypes.Email, decodedToken.Claims["email"]?.ToString() ?? ""),
            };
            var identity = new ClaimsIdentity(claims, "Firebase");
            context.HttpContext.User = new ClaimsPrincipal(identity);
        }
        catch (FirebaseAuthException)
        {
            context.Result = new UnauthorizedResult();
        }
    }
}