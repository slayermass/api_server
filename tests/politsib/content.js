module.exports = ({chai, chaiHttp, server, expect, auth_id}) => describe('Контент', () => {

    // для создания, выборки, удаления
    let pk_content;
    //let slug_content = 'testovyy-1';
    let slug_content;

    describe('/POST /api/content', () => {
        it('(private) Создание контента', (done) => {
            chai.request(server)
                .post('/api/content')
                .set('auth_id', auth_id)
                .send({
                    fk_site: 1,
                    content: {
                        title: "Тестовый",
                        seo_title_content: "Тестовый",
                        intro: "не удалять",
                        text: "<p>не удалять</p>",
                        fk_user_created: 1,
                        type_material: 3,
                        tags: [{
                            id: 29 // тега может и не быть
                        }]
                    }
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');

                    res.body.should.have.property('success');
                    res.body.success.should.be.true;

                    res.body.should.have.property('pk_content');
                    res.body.pk_content.should.be.a('number');

                    res.body.should.have.property('slug_content');
                    res.body.slug_content.should.be.a('string');

                    pk_content = res.body.pk_content;
                    slug_content = res.body.slug_content;

                    console.log(`pk_content: ${pk_content}, slug_content: ${slug_content}`);

                    done();
                });
        });
    });

    // select выборки полей нет, формат жесткий
    // тег не проверяется
    describe('/GET /papi/contentone', () => {
        it('(public) Получение контента и формат по slug_content. Задержка +1000мс', (done) => {
            setTimeout(function() { // искусственная задержка, иначе после создания не находит
                chai.request(server)
                    .get('/papi/contentone')
                    .query({
                        fk_site: 1,
                        slug_content,
                        withimages: 1,
                        withcomments: 1
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');

                        res.body.should.have.property('data');
                        res.body.data.should.be.a('object');

                        res.body.data.should.have.property('title_content');
                        res.body.data.title_content.should.be.a('string');

                        res.body.data.should.have.property('publish_date');
                        res.body.data.publish_date.should.be.a('string');

                        res.body.data.should.have.property('headimgsrc_content');

                        res.body.data.should.have.property('intro_content');
                        res.body.data.intro_content.should.be.a('string');

                        res.body.data.should.have.property('text_content');
                        res.body.data.text_content.should.be.a('string');

                        res.body.data.should.have.property('name_material_rubric');
                        res.body.data.name_material_rubric.should.be.a('string');

                        res.body.data.should.have.property('views');
                        res.body.data.views.should.be.a('number');

                        res.body.data.should.have.property('tags');


                        res.body.should.have.property('images');
                        res.body.images.should.be.a('object');

                        res.body.should.have.property('comments');
                        res.body.comments.should.be.a('object');

                        res.body.should.have.property('author');
                        res.body.comments.should.be.a('object');

                        res.body.author.should.have.property('lastname');
                        res.body.author.lastname.should.be.a('string');
                        res.body.author.should.have.property('name');
                        res.body.author.name.should.be.a('string');
                        res.body.author.should.have.property('secondname');
                        res.body.author.secondname.should.be.a('string');

                        done();
                    });
            }, 1000);
        });
    });

    describe('/DELETE /api/content', () => {
        it('(private) Удаление контента', (done) => {
            chai.request(server)
                .delete('/api/content')
                .set('auth_id', auth_id)
                .send({
                    delArr: pk_content
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');

                    res.body.should.have.property('success');
                    res.body.success.should.be.true;

                    res.body.should.have.property('count');
                    res.body.count.should.be.a('number');
                    res.body.count.should.equal(1);

                    done();
                });
        });
    });

});