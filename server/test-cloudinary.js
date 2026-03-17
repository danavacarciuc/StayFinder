const cloudinary = require("./config/cloudinary");

cloudinary.uploader.upload(
  "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
  { folder: "test" },
  (err, result) => {
    if (err) {
      console.log("EROARE:", err.message);
    } else {
      console.log("SUCCESS:", result.secure_url);
    }
  }
);