const { Article, User, Tag } = require("../models");

const getArticles = async (req, res, next) => {
  const { tag, author, favorited, offset = 0, limit = 20 } = req.query;

  try {
    let tagWhere, authorWhere, favoritedWhere;
    if (tag) {
      tagWhere = { name: tag };
    }
    if (author) {
      authorWhere = { username: author };
    }

    const articles = await Article.findAll({
      include: [
        {
          model: Tag,
          attributes: ["name"],
          where: tagWhere,
          through: { attributes: [] }
        },
        {
          model: User,
          as: "Author",
          where: authorWhere
        }
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    const result = [];
    // Build article objects to return and set following status for each author
    for (let article of articles) {
      result.push(await article.buildResult(req.user));
    }

    return res.json({ articles: result, articlesCount: result.length });
  } catch (error) {
    return next(error);
  }
};

const getFeedArticles = async (req, res, next) => {
  const { limit = 20, offset = 0 } = req.query;

  try {
    const user = await User.findById(req.user.id, {
      include: [
        {
          model: User,
          as: "Followed"
        }
      ]
    });

    const followedIds = user.Followed.map(f => f.id);

    const articles = await Article.findAll({
      where: { AuthorId: followedIds },
      include: { model: User, as: "Author" },
      limit,
      offset
    });

    const result = [];
    for (let article of articles) {
      result.push(await article.buildResult(req.user));
    }

    res.json({ articles: result, articlesCount: result.length });
  } catch (error) {
    return next(error);
  }
};

const getArticleBySlug = async (req, res, next) => {
  const { slug } = req.params;

  try {
    // TODO -Add favorite status and count
    let article = await Article.findOne({
      where: { slug },
      include: [
        { model: Tag, attributes: ["name"], through: { attributes: [] } },
        { model: User, as: "Author" }
      ]
    });

    article = await article.buildResult(req.user);

    return res.json({ article });
  } catch (error) {
    return next(error);
  }
};

const createArticle = async (req, res, next) => {
  const { article } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.sendStatus(401);
    }

    let builtArticle = await Article.create({
      title: article.title,
      body: article.body,
      description: article.description
    });

    let tags = [];

    for (let tag of article.tags) {
      const tagInstance = await Tag.findCreateFind({
        where: { name: tag.name }
      });
      tags.push(tagInstance[0]);
    }

    builtArticle.addTags(tags);
    builtArticle.setAuthor(user);

    return res.json({ article: builtArticle });
  } catch (error) {
    return next(error);
  }
};

const updateArticle = async (req, res, next) => {
  // TODO
};

const deleteArticle = async (req, res, next) => {
  // TODO
};

const favoriteArticle = async (req, res, next) => {
  const { slug } = req.params;

  try {
    let article = await Article.findOne({
      where: { slug },
      include: [{ model: User, as: "Author" }]
    });
    const user = await User.findById(req.user.id);

    await user.setFavorited(article);
    await article.setFavoriter(user);
    await article.increment("favoriteCount");

    article = await article.buildResult(req.user.id);

    return res.json({ article });
  } catch (error) {
    return next(error);
  }
};

const unfavoriteArticle = async (req, res, next) => {
  const { slug } = req.params;

  try {
    let article = await Article.findOne({
      where: { slug },
      include: [{ model: User, as: "Author" }]
    });
    const user = await User.findById(req.user.id);

    await user.removeFavorited(article);
    await article.removeFavoriter(user);
    await article.decrement("favoriteCount");

    article = await article.buildResult(req.user.id);

    return res.json({ article });
  } catch (error) {
    return next(error);
  }
};

const createArticleComment = async (req, res, next) => {
  // TODO
};

const getArticleComments = async (req, res, next) => {
  // TODO
};

const deleteArticleComment = async (req, res, next) => {
  // TODO
};

module.exports = {
  getArticles,
  getArticleBySlug,
  getArticleComments,
  createArticle,
  updateArticle,
  deleteArticle,
  createArticleComment,
  deleteArticleComment,
  favoriteArticle,
  unfavoriteArticle,
  getFeedArticles
};
