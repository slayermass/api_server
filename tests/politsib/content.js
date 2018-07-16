module.exports = ({chai, chaiHttp, server, expect, auth_id}) => describe('Контент', () => {

    let pk_content;
    let slug_content;

    describe('/GET /api/content', () => {
        it('(private) Создание контента', (done) => {
            chai.request(server)
                .post('/api/content')
                .set('auth_id', auth_id)
                .send({
                    "fk_site": 1,
                    "content": {
                        "title": "Тестовый",
                        "seo_title_content": "Тестовый",
                        "intro": "не удалять",
                        "text": "<p>не удалять</p>",
                        "fk_user_created": 1,
                        "type_material": 3,
                        "tags": [{
                            "id": 29 // тега может и не быть
                        }]
                    }
                })
                .end((err, res) => {
                    console.log(res);

                    res.should.have.status(200);
                    res.body.should.be.a('object');

                    res.body.should.have.property('success');
                    res.body.success.should.be.true;

                    /**res.body.should.have.property('pk_content');
                    res.body.pk_content.should.be.a('number');*/

                    pk_content = res.body.pk_content;

                    done();
                });
        });
    });


    // нет slug
    /**describe('/GET /papi/contentone', () => {
        it('(public) Получение контента и формат, одиночный, slug_content', (done) => {
            chai.request(server)
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
    });*/

    // здесь ошибка походу
    /**describe('/GET /papi/contentone', () => {
        it('(public) Получение контента и формат, одиночный, pk_content', (done) => {
            chai.request(server)
                .get('/papi/contentone')
                .query({
                    "fk_site": 1,
                    "withimages": 1,
                    "pk_content": pk_content
                })
                .end((err, res) => {
                    papi_contentone(res, done);
                });
        });
    });*/

    // нет slug
    /**describe('/GET /api/contentone', () => {
        it('(private) Получение контента и формат, одиночный, slug_content', (done) => {
            chai.request(server)
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
    });*/

    /*describe('/GET /api/contentone', () => {
        it('(private) Получение контента и формат, одиночный, pk_content', (done) => {
            chai.request(server)
                .get('/api/contentone')
                .set('auth_id', auth_id)
                .query({
                    "fk_site": 1,
                    "pk_content": pk_content
                })
                .end((err, res) => {
                    papi_contentone(res, done);
                });
        });
    });

    describe('/GET /papi/content', () => {
        it('(public) Получение контента и формат главной страницы', (done) => {
            chai.request(server)
                .get('/papi/content')
                .set('auth_id', auth_id)
                .query({
                    "fk_site": 1,
                    "status": 1
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');

                    res.body.data.should.have.lengthOf.within(1, 20); // @see model.find -> params.limit

                    done();
                });
        });
    });

    describe('/GET /api/content', () => {
        it('(private) Получение контента и формат главной страницы', (done) => {
            chai.request(server)
                .get('/api/content')
                .set('auth_id', auth_id)
                .query({
                    "fk_site": 1,
                    "status": 1
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('data');

                    res.body.data.should.have.lengthOf.within(1, 20); // @see model.find -> params.limit

                    done();
                });
        });
    });

    describe('/GET /api/content', () => {
        it('(private) Удаление контента', (done) => {
            chai.request(server)
                .delete('/api/content')
                .set('auth_id', auth_id)
                .send({
                    "delArr": pk_content
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');

                    res.body.should.have.property('success');
                    res.body.success.should.be.true;

                    res.body.should.have.property('count');
                    res.body.count.should.be.a('number');

                    done();
                });
        });
    });*/

});

function papi_contentone(res, done) {
    res.should.have.status(200);
    res.body.should.be.a('object');
    res.body.should.have.property('data');

    res.body.data.should.have.property('title_content');
    res.body.data.title_content.should.be.a('string');

    // главной картинки может и не быть
    /**res.body.data.should.have.property('headimgsrc_content');
     res.body.data.headimgsrc_content.should.be.a('string');*/

    res.body.data.should.have.property('text_content');
    res.body.data.text_content.should.be.a('string');

    res.body.data.should.have.property('views');

    done();
}
