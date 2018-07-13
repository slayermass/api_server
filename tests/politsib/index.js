'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../app');
const expect = require('chai').expect;

// -----------
chai.should();

chai.use(chaiHttp);

const exportsObj = {chai, chaiHttp, server, expect};

require('./menu_items')(exportsObj);

require('./mainpage')(exportsObj);