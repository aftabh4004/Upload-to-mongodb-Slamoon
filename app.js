const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Mongo URI
const mongoURI =  'mongodb://localhost/Slamoon';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;
let cur_user;
conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    const filename =  cur_user + path.extname(file.originalname);
    const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
    };
    return fileInfo;
  }
});
const upload = multer({ storage });

//@route GET /favicon.ico
// @desc this route was creating problem
app.get('/favicon.ico', (req, res) => {
    res.end();
});

// @route GET /
// @desc Loads form
app.get('/:id', (req, res) => {
  console.log("here");
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      console.log('para ' + req.params.id);
      cur_user = req.params.id;
      res.render('index', { files: false, username: req.params.id });
    } else {
      files.map(file => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/png'
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      console.log('para 2' + req.params.id);
      cur_user = req.params.id;
      res.render('index', { files: files, username: req.params.id});
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload/:id', upload.single('profile'), (req, res) => {
  // res.json({ file: req.file });
  res.redirect(`http://localhost:9000/profile/${req.params.id}`);
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename },(err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ filename: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/' + req.params.id.substr(0, req.params.id.indexOf('.')));
  });
});

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));
