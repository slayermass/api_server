module.exports = ({chai, chaiHttp, server, expect}) => describe('Главная страница', () => {

    describe('/GET /papi/mainpage', () => {
        it('(public) главная страница', (done) => {
            chai.request(server)
                .get('/papi/mainpage')
                .query({
                    "fk_site": 1,
                    "select" : 'title_content,text_content'
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');

                    res.body.should.have.property('success');
                    res.body.success.should.be.true;

                    res.body.should.have.property('data');
                    res.body.data.should.be.a('array');
                    expect(res.body.data).to.have.length.within(5,15); // примерно

                    res.body.data[0].should.contain.property('pk_content');
                    res.body.data[0].pk_content.should.be.a('number');

                    res.body.data[0].should.contain.property('count_comments');
                    res.body.data[0].count_comments.should.be.a('number');

                    // доп параметры
                    res.body.data[0].should.contain.property('title_content');
                    res.body.data[0].title_content.should.be.a('string');

                    res.body.data[0].should.contain.property('text_content');
                    res.body.data[0].text_content.should.be.a('string');
                    // end доп параметры

                    done();
                });
        });
    });

    // без select должен выдать минимальную инфу
    describe('/GET /papi/mainpage', () => {
        it('(public) главная страница без `select`', (done) => {
            chai.request(server)
                .get('/papi/mainpage')
                .query({
                    "fk_site": 1
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');

                    res.body.should.have.property('success');
                    res.body.success.should.be.true;

                    res.body.should.have.property('data');
                    res.body.data.should.be.a('array');
                    expect(res.body.data).to.have.length.within(5,15); // примерно

                    res.body.data[0].should.contain.property('pk_content');
                    res.body.data[0].pk_content.should.be.a('number');

                    res.body.data[0].should.contain.property('count_comments');
                    res.body.data[0].count_comments.should.be.a('number');

                    done();
                });
        });
    });

    describe('/GET /papi/mainpage', () => {
        it('(public) главная страница без `fk_site`', (done) => {
            chai.request(server)
                .get('/papi/mainpage')
                .query({
                    "select" : 'title_content,text_content'
                })
                .end((err, res) => {
                    res.should.have.status(400);

                    done();
                });
        });
    });

});
