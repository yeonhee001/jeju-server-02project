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
let replyCollection; 

// DB 연결 함수
async function dataCtrl() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  const db = client.db('JejuDB');
  postCollection = db.collection('post');
  commentCollection = db.collection('comments');
  replyCollection = db.collection('reply'); 
}

// multer 설정: 메모리 저장소
const storage = multer.memoryStorage();
const upload = multer({ storage }).array('images', 4);

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

// 이미지 업로드 엔드포인트
post.post('/images', upload, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '업로드할 이미지가 없습니다.' });
    }

    const urls = await Promise.all(
      req.files.map(file => uploadToImgur(file.buffer))
    );
    res.json(urls);
  } catch (error) {
    console.error('다중 이미지 업로드 실패:', error);
    res.status(500).json({ message: '이미지 업로드 실패', error: error.message });
  }
});

// 게시글 등록
post.post('/', async (req, res) => {
  await dataCtrl();
  try {
    const result = await postCollection.insertOne(req.body);
    res.json({ message: '등록 성공' });
  } catch (error) {
    console.error('등록 실패:', error);
    res.status(500).json({ message: '등록 실패', error: error.message });
  }
});

// 게시글 전체 조회
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

  // ID가 없거나 유효하지 않은 경우 빈 배열 반환
  if (!id || !ObjectId.isValid(id)) {
    return res.json([]);
  }

  try {
    const postItem = await postCollection.findOne({ _id: new ObjectId(id) });
    if (!postItem) {
      return res.json([]);
    }
    res.json(postItem);
  } catch (error) {
    console.error('게시글 조회 실패:', error);
    res.status(500).json({ message: '게시글 조회 실패', error });
  }
});

// 사용자별 게시글 조회
post.get('/user/:userId', async (req, res) => {
  await dataCtrl();
  const { userId } = req.params;

  try {
    const postItem = await postCollection.find({ userId }).toArray();
    res.json(postItem);
  } catch (error) {
    console.error('유저 게시글 조회 실패:', error);
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
    await replyCollection.deleteMany({ postId: id }); // reply 댓글 삭제
    const likeCollection = client.db('JejuDB').collection('like');
    await likeCollection.deleteMany({ postId: id }); // like 삭제

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

// 이미지 목록 조회
post.get('/images', async (req, res) => {
  await dataCtrl();
  const { page } = req.query;
  const limit = 30;
  const skip = (page - 1) * limit;

  try {
    const posts = await postCollection.find().skip(skip).limit(limit).toArray();

    const data = posts
      .filter(post => post.imageUrls && post.imageUrls[0])
      .map(post => ({
        id: post._id,
        imageUrl: post.imageUrls[0],
        post
      }));

    res.json(data);
  } catch (error) {
    console.error('이미지 조회 실패:', error);
    res.status(500).json({ message: '이미지 조회 실패', error });
  }
});

module.exports = post;