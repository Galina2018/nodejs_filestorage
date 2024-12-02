const express = require('express');
const path = require('path');
const fs = require('fs');
// const multer = require('multer');
const bodyParser = require('body-parser');

const webserver = express();
// const upload = multer();
const port = 7380;

// webserver.use(bodyParser.text({}));
webserver.use(bodyParser.json({}));
webserver.use(express.urlencoded({ extended: true }));
webserver.use(express.static(path.resolve(__dirname, 'public')));

webserver.get('/', (req, res) => {
  const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
  res.send(html);
});

webserver.get('/getListFiles', (req, res) => {
  const listFiles = fs.readFileSync(
    path.resolve(__dirname, './public', 'list.json'),
    'utf8'
  );
  res.send(listFiles);
});

// webserver.post('/download', upload.none(), function(req, res) {
webserver.post('/download', function(req, res) {
  console.log('req.body', req.body);
  // var file = __dirname + '/upload-folder/dramaticpenguin.MOV';

  // var filename = path.basename(file);
  // var mimetype = mime.getType(file);

  // res.setHeader('Content-disposition', 'attachment; filename=' + filename);
  // res.setHeader('Content-type', mimetype);

  // var filestream = fs.createReadStream(file);
  // filestream.pipe(res);
});

// webserver.post('/download', (req, res) => {
//   res.setHeader('Content-Disposition', 'attachment; filename="fff.html"');
//   res.setHeader('Content-Type', 'text/html');

//   res.send('hello <b>goodbye</b>');
// });

webserver.listen(port, () => console.log('webserver running on port ' + port));
