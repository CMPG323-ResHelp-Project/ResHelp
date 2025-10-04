"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_ssr_lib_firebase_ts";
exports.ids = ["_ssr_lib_firebase_ts"];
exports.modules = {

/***/ "(ssr)/./lib/firebase.ts":
/*!*************************!*\
  !*** ./lib/firebase.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   auth: () => (/* binding */ auth)\n/* harmony export */ });\n/* harmony import */ var firebase_app__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! firebase/app */ \"(ssr)/../../../../node_modules/firebase/app/dist/index.mjs\");\n/* harmony import */ var firebase_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! firebase/auth */ \"(ssr)/../../../../node_modules/firebase/auth/dist/index.mjs\");\n// Import the functions you need from the SDKs you need\n\n\n// TODO: Add SDKs for Firebase products that you want to use\n// https://firebase.google.com/docs/web/setup#available-libraries\n// Your web app's Firebase configuration\n// For Firebase JS SDK v7.20.0 and later, measurementId is optional\nconst firebaseConfig = {\n    apiKey: \"AIzaSyAXsXO7r2aFVhzU0RCpYvzX_czW0zPDujs\",\n    authDomain: \"reshelp-ba48b.firebaseapp.com\",\n    databaseURL: \"https://reshelp-ba48b-default-rtdb.firebaseio.com\",\n    projectId: \"reshelp-ba48b\",\n    storageBucket: \"reshelp-ba48b.firebasestorage.app\",\n    messagingSenderId: \"109807635599\",\n    appId: \"1:109807635599:web:48f12d6608270a03f074fa\",\n    measurementId: \"G-D2R1ME3KTC\"\n};\n// Initialize Firebase\nconst app = (0,firebase_app__WEBPACK_IMPORTED_MODULE_0__.initializeApp)(firebaseConfig);\nconst auth = (0,firebase_auth__WEBPACK_IMPORTED_MODULE_1__.getAuth)(app);\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9saWIvZmlyZWJhc2UudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsdURBQXVEO0FBQ1Y7QUFDTDtBQUV4Qyw0REFBNEQ7QUFDNUQsaUVBQWlFO0FBRWpFLHdDQUF3QztBQUN4QyxtRUFBbUU7QUFDbkUsTUFBTUUsaUJBQWlCO0lBQ3JCQyxRQUFRO0lBQ1JDLFlBQVk7SUFDWkMsYUFBYTtJQUNiQyxXQUFXO0lBQ1hDLGVBQWU7SUFDZkMsbUJBQW1CO0lBQ25CQyxPQUFPO0lBQ1BDLGVBQWU7QUFDakI7QUFFQSxzQkFBc0I7QUFDdEIsTUFBTUMsTUFBTVgsMkRBQWFBLENBQUNFO0FBQzFCLE1BQU1VLE9BQU9YLHNEQUFPQSxDQUFDVTtBQUVMIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXEFTVVNcXERvY3VtZW50c1xcUmVzSGVscFxcRnJvbnRlbmRcXG1haW50ZW5hbmNlLXN5c3RlbVxcbGliXFxmaXJlYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBJbXBvcnQgdGhlIGZ1bmN0aW9ucyB5b3UgbmVlZCBmcm9tIHRoZSBTREtzIHlvdSBuZWVkXHJcbmltcG9ydCB7IGluaXRpYWxpemVBcHAgfSBmcm9tIFwiZmlyZWJhc2UvYXBwXCI7XHJcbmltcG9ydCB7IGdldEF1dGggfSBmcm9tIFwiZmlyZWJhc2UvYXV0aFwiO1xyXG5cclxuLy8gVE9ETzogQWRkIFNES3MgZm9yIEZpcmViYXNlIHByb2R1Y3RzIHRoYXQgeW91IHdhbnQgdG8gdXNlXHJcbi8vIGh0dHBzOi8vZmlyZWJhc2UuZ29vZ2xlLmNvbS9kb2NzL3dlYi9zZXR1cCNhdmFpbGFibGUtbGlicmFyaWVzXHJcblxyXG4vLyBZb3VyIHdlYiBhcHAncyBGaXJlYmFzZSBjb25maWd1cmF0aW9uXHJcbi8vIEZvciBGaXJlYmFzZSBKUyBTREsgdjcuMjAuMCBhbmQgbGF0ZXIsIG1lYXN1cmVtZW50SWQgaXMgb3B0aW9uYWxcclxuY29uc3QgZmlyZWJhc2VDb25maWcgPSB7XHJcbiAgYXBpS2V5OiBcIkFJemFTeUFYc1hPN3IyYUZWaHpVMFJDcFl2elhfY3pXMHpQRHVqc1wiLFxyXG4gIGF1dGhEb21haW46IFwicmVzaGVscC1iYTQ4Yi5maXJlYmFzZWFwcC5jb21cIixcclxuICBkYXRhYmFzZVVSTDogXCJodHRwczovL3Jlc2hlbHAtYmE0OGItZGVmYXVsdC1ydGRiLmZpcmViYXNlaW8uY29tXCIsXHJcbiAgcHJvamVjdElkOiBcInJlc2hlbHAtYmE0OGJcIixcclxuICBzdG9yYWdlQnVja2V0OiBcInJlc2hlbHAtYmE0OGIuZmlyZWJhc2VzdG9yYWdlLmFwcFwiLFxyXG4gIG1lc3NhZ2luZ1NlbmRlcklkOiBcIjEwOTgwNzYzNTU5OVwiLFxyXG4gIGFwcElkOiBcIjE6MTA5ODA3NjM1NTk5OndlYjo0OGYxMmQ2NjA4MjcwYTAzZjA3NGZhXCIsXHJcbiAgbWVhc3VyZW1lbnRJZDogXCJHLUQyUjFNRTNLVENcIlxyXG59O1xyXG5cclxuLy8gSW5pdGlhbGl6ZSBGaXJlYmFzZVxyXG5jb25zdCBhcHAgPSBpbml0aWFsaXplQXBwKGZpcmViYXNlQ29uZmlnKTtcclxuY29uc3QgYXV0aCA9IGdldEF1dGgoYXBwKTtcclxuXHJcbmV4cG9ydCB7IGF1dGggfTsiXSwibmFtZXMiOlsiaW5pdGlhbGl6ZUFwcCIsImdldEF1dGgiLCJmaXJlYmFzZUNvbmZpZyIsImFwaUtleSIsImF1dGhEb21haW4iLCJkYXRhYmFzZVVSTCIsInByb2plY3RJZCIsInN0b3JhZ2VCdWNrZXQiLCJtZXNzYWdpbmdTZW5kZXJJZCIsImFwcElkIiwibWVhc3VyZW1lbnRJZCIsImFwcCIsImF1dGgiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./lib/firebase.ts\n");

/***/ })

};
;