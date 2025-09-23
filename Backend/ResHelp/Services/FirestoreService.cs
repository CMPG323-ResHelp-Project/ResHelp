using Google.Cloud.Firestore;
using ResHelp.Models;

namespace ResHelp.Services
{
    public class FirestoreService
    {
        private readonly FirestoreDb _firestoreDb;

        public FirestoreService(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        public async Task AddUserAsync(UserDto user)
        {
            var usersCollection = _firestoreDb.Collection("users");
            var docRef = usersCollection.Document(user.Email); // use email as doc ID
            await docRef.SetAsync(new
            {
                user.Name,
                user.Surname,
                user.Email,
                user.Phone,
                user.Password,
                user.UserType,
                user.MaintenanceType,
                user.Address,
                CreatedAt = Timestamp.GetCurrentTimestamp()
            });
        }
    }
}
