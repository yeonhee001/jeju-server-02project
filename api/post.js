const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const post = express.Router();

// 환경 변수
const uri = process.env.MONGODB;
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

// MongoDB 클라이언트
const client = new MongoClient(uri);
let postCollection;
let commentCollection;

// DB 연결 함수
async function dataCtrl() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  const db = client.db('JejuDB');
  postCollection = db.collection('post');
  commentCollection = db.collection('comments');
}

// multer 설정: 메모리 저장소
const storage = multer.memoryStorage();
const upload = multer({ storage }).array('images', 4); // 최대 4개 이미지 업로드

// Imgur 이미지 업로드 함수
async function uploadToImgur(buffer) {
  try {
    const response = await axios.post(
      'https://api.imgur.com/3/image',
      {
        image: buffer.toString('base64'),
        type: 'base64',
      },
      {
        headers: {
          Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
        },
      }
    );
    return response.data.data.link;
  } catch (error) {
    console.error('Imgur 업로드 실패:', error.response?.data || error.message);
    throw new Error('Imgur 업로드 실패');
  }
}

// 다중 이미지 업로드 전용 라우터
post.post('/images', upload, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '업로드할 이미지가 없습니다.' });
    }

    const urls = await Promise.all(
      req.files.map(file => uploadToImgur(file.buffer))
    );

    console.log(urls);

    res.json(urls); // 이미지 URL 배열 반환
  } catch (error) {
    console.error('다중 이미지 업로드 실패:', error);
    res.status(500).json({ message: '이미지 업로드 실패', error: error.message });
  }
});

// 새 게시글 등록 (이미지는 클라이언트가 URL로 전달)
post.post('/', async (req, res) => {
  await dataCtrl();
  try {
    const { subject, title, description, imageUrls, userId, username } = req.body;

    const postData = {
      subject,
      title,
      description,
      imageUrls: imageUrls || [], // 이미지 URL 배열 저장
      userId,
      username,
      createdAt: new Date().toISOString(),
    };

    const result = await postCollection.insertOne(postData);
    res.json({ message: '등록 성공', id: result.insertedId });
  } catch (error) {
    console.error('등록 실패:', error);
    res.status(500).json({ message: '등록 실패', error: error.message });
  }
});

// 게시글 목록 조회
post.get('/', async (req, res) => {
  await dataCtrl();
  try {
    const posts = await postCollection.find().toArray();
    res.json(posts);
  } catch (error) {
    console.error('조회 실패:', error);
    res.status(500).json({ message: '조회 실패', error });
  }
});

// 게시글 단건 조회
post.get('/update/:id', async (req, res) => {
  await dataCtrl();
  const { id } = req.params;
  try {
    const postItem = await postCollection.findOne({ _id: new ObjectId(id) });
    if (!postItem) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }
    res.json(postItem);
  } catch (error) {
    console.error('게시글 조회 실패:', error);
    res.status(500).json({ message: '게시글 조회 실패', error });
  }
});

// 게시글 수정
post.put('/:id', async (req, res) => {
  await dataCtrl();
  const { id } = req.params;
  const updatedPost = req.body;

  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 ID 형식입니다.' });
    }

    const { _id, createdAt, ...fieldsToUpdate } = updatedPost;

    const result = await postCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...fieldsToUpdate,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    res.json({ message: '게시글 수정 성공' });
  } catch (error) {
    console.error('게시글 수정 실패:', error);
    res.status(500).json({ message: '게시글 수정 실패', error });
  }
});

// 게시글 삭제
post.delete('/:id', async (req, res) => {
  await dataCtrl();
  const { id } = req.params;

  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 ID 형식입니다.' });
    }

    const result = await postCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    await commentCollection.deleteMany({ postId: id });

    res.json({ message: '게시글 삭제 성공' });
  } catch (error) {
    console.error('게시글 삭제 실패:', error);
    res.status(500).json({ message: '게시글 삭제 실패', error });
  }
});

// 댓글 등록
post.post('/comment', async (req, res) => {
  await dataCtrl();
  const { postId, userId, username, text } = req.body;

  try {
    const result = await commentCollection.insertOne({
      postId,
      userId,
      username,
      text,
      createdAt: new Date().toISOString(),
    });
    res.json({ message: '댓글 등록 성공', id: result.insertedId });
  } catch (error) {
    console.error('댓글 등록 실패:', error);
    res.status(500).json({ message: '댓글 등록 실패', error });
  }
});

// 특정 게시물의 댓글 조회
post.get('/comment/:postId', async (req, res) => {
  await dataCtrl();
  const { postId } = req.params;

  try {
    const comments = await commentCollection.find({ postId }).toArray();
    res.json(comments);
  } catch (error) {
    console.error('댓글 조회 실패:', error);
    res.status(500).json({ message: '댓글 조회 실패', error });
  }
});

// 이미지 목록 조회 (페이지네이션)
post.get('/images', async (req, res) => {
  await dataCtrl();
  const { page} = req.query; // 기본값으로 1 페이지 설정
  const limit = 30; // 한 번에 가져올 이미지 수
  const skip = (page - 1) * limit; // 페이지에 맞춰서 건너뛸 데이터 수

  try {
    const posts = await postCollection.find().skip(skip).limit(limit).toArray();
    console.log(posts)
    const images = posts.map(post => post.imageUrls[0]).flat(Infinity); // 모든 게시글의 이미지 URL을 가져옴
    res.json(images.filter(img=>img!=null)); // 이미지 URL 배열만 반환
  } catch (error) {
    console.error('이미지 조회 실패:', error);
    res.status(500).json({ message: '이미지 조회 실패', error });
  }
});

module.exports = post;