const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // get .jpg, .png
    const rollNumber = req.body.RollNumber;

    if (!rollNumber) {
      // If RollNumber not provided in body, fallback to timestamp
      cb(
        null,
        file.fieldname + "-" + Date.now() + ext
      );
    } else {
      cb(null, `${rollNumber}${ext}`);
    }
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
