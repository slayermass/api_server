'use strict';

process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHttp = require('chai-http');
// let server = require('../app');
const auth_id = require("../config/index").auth_id;
const local_server = 'http://127.0.0.1:3001';

chai.should();

chai.use(chaiHttp);

describe('Контент', () => {

    describe('/GET /papi/contentone', () => {
        it('(public) Получение контента и формат, slug_content', (done) => {
            chai.request(local_server)
                .get('/papi/contentone')
                .query({
                    "fk_site": 1,
                    "withimages": 1,
                    "slug_content": "test-0"
                })
                .end((err, res) => {
                    papi_contentone(res, done);
                });
        });
    });

    describe('/GET /papi/contentone', () => {
        it('(public) Получение контента и формат, pk_content', (done) => {
            chai.request(local_server)
                .get('/papi/contentone')
                .query({
                    "fk_site": 1,
                    "withimages": 1,
                    "pk_content": 33
                })
                .end((err, res) => {
                    papi_contentone(res, done);
                });
        });
    });

    describe('/GET /api/contentone', () => {
        it('(private) Получение контента и формат, slug_content', (done) => {
            chai.request(local_server)
                .get('/api/contentone')
                .set('auth_id', auth_id)
                .query({
                    "fk_site": 1,
                    "slug_content": "test-0"
                })
                .end((err, res) => {
                    papi_contentone(res, done);
                });
        });
    });

    describe('/GET /api/contentone', () => {
        it('(private) Получение контента и формат, pk_content', (done) => {
            chai.request(local_server)
                .get('/api/contentone')
                .set('auth_id', auth_id)
                .query({
                    "fk_site": 1,
                    "pk_content": 33
                })
                .end((err, res) => {
                    papi_contentone(res, done);
                });
        });
    });

});

function papi_contentone(res, done) {
    res.should.have.status(200);
    res.body.should.be.a('object');
    res.body.should.have.property('data');

    res.body.data.should.have.property('title_content');
    res.body.data.title_content.should.be.a('string');

    res.body.data.should.have.property('headimgsrc_content');
    res.body.data.headimgsrc_content.should.be.a('string');

    res.body.data.should.have.property('text_content');
    res.body.data.text_content.should.be.a('string');

    res.body.data.should.have.property('views');

    done();
}
