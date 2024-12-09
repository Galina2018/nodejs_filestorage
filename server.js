const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
// const busboy = require('connect-busboy');
const progress = require('progress-stream');

const webserver = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public'));
  },
  filename: (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString(
      'utf8'
    );
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });
const port = 7380;

webserver.use(bodyParser.text({}));
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

webserver.post('/download', (req, res) => {
  let filename = req.body;
  let filePath = path.resolve(__dirname, 'public', filename);
  res.setHeader('Content-disposition', 'attachment; filename=' + filename);
  res.download(filePath, (err) => {
    if (err) {
      res.status(500).send('Ошибка при скачивании файла');
    }
  });
});

let connection_;
let clients = [];
let timer = 0;

const ws = new WebSocket.Server({ port: 7381 });
ws.on('connection', (connection) => {
  connection_ = connection;
  connection.send('hello from server to client!');
  connection.on('message', (message) => {
    if (message === 'KEEP_ME_ALIVE') {
      clients.forEach((client) => {
        if (client.connection === connection) client.lastkeepalive = Date.now();
      });
    } else console.log('сервером получено сообщение от клиента: ' + message);
  });
  clients.push({ connection: connection, lastkeepalive: Date.now() });
});
setInterval(() => {
  timer++;
  clients.forEach((client) => {
    if (Date.now() - client.lastkeepalive > 12000) {
      client.connection.terminate();
      client.connection = null;
    } else client.connection.send('timer=' + timer);
  });
  clients = clients.filter((client) => client.connection);
}, 3000);

const uploadFile = upload.single('file');
webserver.post('/upload', (req, res) => {
  let prfile = 0;
  var fileProgress = progress();
  const fileLength = +req.headers['content-length'];

  req.pipe(fileProgress);
  fileProgress.headers = req.headers;

  fileProgress.on('progress', (info) => {
    prfile = connection_.send((info.transferred / +fileLength) * 100);
  });

  uploadFile(fileProgress, res, async (err) => {
    if (err) return res.status(500);
    console.log(
      'file saved, origin filename=' +
        fileProgress.file.originalname +
        ', store filename=' +
        fileProgress.file.filename
    );
    res.send('File ' + fileProgress.file.originalname + ' uploaded');
    const fd = path.resolve(__dirname, 'public', 'list.json');
    fs.readFile(fd, 'utf8', (err, arr) => {
      if (err) {
        console.error(err);
      } else {
        let data;
        try {
          data = JSON.parse(arr);
          data.push({ fileName: fileProgress.file.originalname, comments: [] });
        } catch (err) {
          console.error(err);
        }
        fs.writeFile(fd, JSON.stringify(data), (err) => {
          if (err) {
            console.error(err);
          } else {
            connection_.send('Файл json обновлен.');
          }
        });
      }
    });
  });
});

webserver.post('/getComment', (req, res) => {
  const listFN = path.resolve(__dirname, 'public', 'list.json');
  const list = fs.readFileSync(listFN, 'utf8');
  let listObj = JSON.parse(list);
  let listItem = listObj.filter((e) => e.fileName === req.body);
  const text = listItem[0].comments;
  res.send(text);
});

webserver.post('/addComment', (req, res) => {
  const body = JSON.parse(req.body);
  const fileName = body.fileName;
  const listFN = path.resolve(__dirname, 'public', 'list.json');
  const list = fs.readFileSync(listFN, 'utf8');
  let listObj = JSON.parse(list);
  let listItem = listObj.filter((e) => e.fileName === fileName);
  listItem[0].comments.push(body.comment);
  fs.writeFileSync(listFN, JSON.stringify(listObj), 'utf8');
  res.send('Комментарий успешно добавлен!');
});

webserver.listen(port, () => console.log('webserver running on port ' + port));
