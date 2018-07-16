module.exports = ({chai, chaiHttp, server, expect}) => describe('Меню', () => {

    describe('/GET /papi/menu_items', () => {
        it('(public) Меню', (done) => {
            chai.request(server)
                .get('/papi/menu_items')
                .query({
                    "fk_site": 1,
                    "label_menu" : 'main'
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');

                    res.body.should.have.property('success');
                    res.body.success.should.be.true;

                    res.body.should.have.property('menu_items');
                    res.body.menu_items.should.be.a('array');
                    expect(res.body.menu_items).to.have.length.within(2,10); // примерно

                    res.body.should.contain.property('label_menu');
                    res.body.label_menu.should.be.a('string');

                    res.body.menu_items[0].should.contain.property('name_menu_item');
                    res.body.menu_items[0].should.contain.property('path_menu_item');
                    res.body.menu_items[0].name_menu_item.should.be.a('string');
                    res.body.menu_items[0].path_menu_item.should.be.a('string');

                    done();
                });
        });
    });

    describe('/GET /papi/menu_items', () => {
        it('(public) Меню ошибка без `label_menu`', (done) => {
            chai.request(server)
                .get('/papi/menu_items')
                .query({
                    "fk_site": 1
                })
                .end((err, res) => {
                    res.should.have.status(400);

                    done();
                });
        });
    });

    describe('/GET /papi/menu_items', () => {
        it('(public) Меню ошибка без `fk_site`', (done) => {
            chai.request(server)
                .get('/papi/menu_items')
                .query({
                    "label_menu" : 'main'
                })
                .end((err, res) => {
                    res.should.have.status(400);

                    done();
                });
        });
    });

});
