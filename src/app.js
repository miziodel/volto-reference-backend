import express from 'express';
import bodyParser from 'body-parser';
import { drop, head, map } from 'lodash';

import routes from './routes';
import { DocumentRepository } from './repositories';

const app = express();

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

function traverse(document, slugs) {
  if (slugs.length === 0) {
    return Promise.resolve(document);
  } else {
    return DocumentRepository.findOne({
      parent: document.get('uuid'),
      id: head(slugs),
    }).then(parent => traverse(parent, drop(slugs)));
  }
}

map(routes, route => {
  app[route.op](`*${route.view}`, (req, res) => {
    const slugs = req.params[0].split('/');
    DocumentRepository.findOne({ parent: null })
      .then(document => traverse(document, drop(slugs)))
      .then(document => route.handler(document, req, res))
      .catch(DocumentRepository.Model.NotFoundError, () => {
        res.status(404).send({ error: 'Not Found' });
      });
  });
});

export default app;
