'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../app');
const expect = require('chai').expect;
const auth_id = require('../../config').auth_id;

// -----------
chai.should();

chai.use(chaiHttp);

const exportsObj = {chai, chaiHttp, server, expect, auth_id};


// PUBLIC
//require('./menu_items')(exportsObj);

//require('./mainpage')(exportsObj);

require('./content')(exportsObj);