// server.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { AbilityBuilder, Ability } = require('@casl/ability');
const app = express();

const port = process.env.PORT || 8080;

const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: { type: String, default: 'user' }
}));

const Post = mongoose.model('Post', new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}));

app.use(bodyParser.json());

// set up MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', { useNewUrlParser: true });


// set up Casl+ ability
const buildAbility = (user) => {

  const { can, cannot, build } = new AbilityBuilder(Ability);

  if (user.role === 'admin') {
    can('manage', 'all');
  } else {
    can('read', 'Post');
    can(['create', 'update', 'delete'], 'Post', { author: user._id });
  }

   return build();

};

// set up routes
app.get('/posts', async (req, res) => {
  const user = req.body.email;
  const ability = buildAbility(user);

  if (!ability.can('read', 'Post')) {
    return res.status(403).json({ message: 'You are not authorized to perform this action' });
  }

  const posts = await Post.find({}).populate('author');

  res.json(posts);
});

app.post('/posts', async (req, res) => {
  const user = req.body;
  const ability = buildAbility(user);

  if (!ability.can('create', 'Post')) {
    return res.status(403).json({ message: 'You are not authorized to perform this action' });
  }

  const  post = await new Post({ ...req.body, author: user.id }).save();
  res.json(post);
});

app.put('/posts/:id', async (req, res) => {
 try {

      const post = await Post.findById(req.params.id);
      const user =  await User.findById(post.author)
      const ability = buildAbility(user);


      if (!ability.can('update', post)) {
        return res.status(403).json({ message: 'You are not authorized to perform this action' });
      }

      post.set(req.body);
      await post.save();
      res.json(post);
  
 } catch (error) {

    
    console.log(error);
      res.json({error})
 }
  

});

app.delete('/posts/:id', async (req, res) => {
 
  const post = await Post.findById(req.params.id);
  const user =   await User.findById(post.author);


    const ability = buildAbility(user);


  if (!ability.can('delete', post)) {
    return res.status(403).json({ message: 'You are not authorized to perform this action' });
  }

        await post.deleteOne()
      res.json({ message: 'Post deleted' });
});


app.post('/signup', (req, res) => {
  const {body} = req;

    // User.insertMany([{

    //   username: body.name,
    //   email: body.email,
    //   password: body.password,
    //   role: body.role

    // }]);

    User.insertMany(body)

    res.json({userCreated: body})

});

// start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});




// const { accessibleRecordsPlugin } = require('@casl/mongoose');
// const mongoose = require('mongoose');


// const postSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   body: { type: String, required: true },
//   author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
// });

// postSchema.plugin(accessibleRecordsPlugin);



// const { AbilityBuilder, Ability } = require('@casl/ability');

// // Define abilities
// function defineAbilitiesFor(user) {
//   const { can, cannot, build } = new AbilityBuilder(Ability);

//   // Guests can only read posts and comments
//   can('read', ['Post', 'Comment']);

//   // Users can create, update and delete their own posts and comments
//   can('create', ['Post', 'Comment'], { author: user._id });
//   can('update', ['Post', 'Comment'], { author: user._id });
//   can('delete', ['Post', 'Comment'], { author: user._id });

//   // Admins can do everything
//   if (user.role === 'admin') {
//     can('manage', 'all');
//   }

//   return build();
// }


// const ability = defineAbilitiesFor(currentUser);

// // Check if the current user can create a post
// const canCreatePost = ability.can('create', 'Post');



// const { defineAbility } = require('@casl/ability');
// const User = require('./models/user');
// const Post = require('./models/post');
// const Comment = require('./models/comment');

// // define roles
// const roles = ['user', 'admin'];

// // define abilities for user role
// const defineUserAbilities = (user) => {
//   const { role } = user;
//   const can = defineAbility((allow) => {
//     allow('read', Post);
//     allow('read', Comment);
//     allow('create', Post);
//     allow('update', Post, { authorId: user.id });
//     allow('delete', Post, { authorId: user.id });
//     allow('create', Comment);
//     allow('update', Comment, { authorId: user.id });
//     allow('delete', Comment, { authorId: user.id });
//   });
//   return can;
// };

// // define abilities for admin role
// const defineAdminAbilities = (user) => {
//   const can = defineAbility((allow) => {
//     allow('manage', [User, Post, Comment]);
//   });
//   return can;
// };

// // check if user has permission to perform an action
// const checkPermission = async (user, action, resource) => {
//   const ability = user.role === 'admin' ? defineAdminAbilities(user) : defineUserAbilities(user);
//   return ability.can(action, resource).valueOf();
// };

// // usage example
// const user = { id: 1, role: 'user' };
// const post = { id: 1, authorId: 1 };
// const comment = { id: 1, authorId: 2, postId: 1 };

// console.log(await checkPermission(user, 'create', Post)); // true
// console.log(await checkPermission(user, 'update', Post)); // true
// console.log(await checkPermission(user, 'delete', Post)); // true
// console.log(await checkPermission(user, 'create', Comment)); // true
// console.log(await checkPermission(user, 'update', Comment)); // false
// console.log(await checkPermission(user, 'delete', Comment)); // false
// console.log(await checkPermission(user, 'read', Post)); // true
// console.log(await checkPermission(user, 'read', Comment)); // true
