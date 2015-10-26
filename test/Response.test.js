'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('lr-sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const PassThrough       = require('stream').PassThrough;
const Transform         = require('stream').Transform;

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect = chai.expect;

const Response = require('./..').Response;
let response;

describe('SuperRouterResponse', () => {

  beforeEach(() => {
    response = new Response();
  });

  describe('statusCode', () => {
    it('should default to 200', () => {
      expect(response.statusCode).to.equal(200);
    });

    it('should throw an error if assigned a non-numeric value', () => {
      expect(() => {
        response.statusCode = 'asdf';
      }).to.throw('statusCode must be a number.');
    });

    it('should be assignable', () => {
      response.statusCode = 500;
      expect(response.statusCode).to.equal(500);
    });
  });

  describe('headers', () => {
    it('should return undefined for an undefined header', () => {
      expect(response.getHeader('asdf')).to.be.undefined;
    });

    it('should throw if set key is not defined', () => {
      expect(() => {
        response.setHeader();
      }).to.throw('First argument: key must be a string.');
    });

    it('should throw if set key is not a string', () => {
      expect(() => {
        response.setHeader(7);
      }).to.throw('First argument: key must be a string.');
    });

    it('should throw if set value is not defined', () => {
      expect(() => {
        response.setHeader('Content-Type');
      }).to.throw('Second argument: value must be a string.');
    });

    it('should throw if set value is not a string', () => {
      expect(() => {
        response.setHeader('Content-Type', 7);
      }).to.throw('Second argument: value must be a string.');
    });

    it('should be settable', () => {
      response.setHeader('Content-Type', 'application/json');
      expect(response.getHeader('Content-Type')).to.equal('application/json');
    });

    it('should allow clearing of headers', () => {
      response.setHeader('Content-Type', 'application/json');
      expect(response.getHeader('Content-Type')).to.equal('application/json');
      response.clearHeader('Content-Type');
      expect(response.getHeader('Content-Type')).to.be.undefined;
    });
  });

  describe('body', () => {
    let inStream;
    let outStream;

    beforeEach(() => {
      inStream  = new PassThrough();
      outStream = new PassThrough();
      inStream.pipe(response.body).pipe(outStream);
    });

    it('should extend Transform stream', () => {
      expect(response.body).to.be.instanceof(Transform);
    });

    it('should be readable and writable', (done) => {
      inStream.end('hello world');
      outStream.on('data', (chunk) => {
        expect(chunk.toString()).to.equal('hello world');
        done();
      });
    });

    it('should lock headers once data is written to the pipe', (done) => {
      response.setHeader('Content-Type', 'application/json');

      inStream.end('chunk');
      outStream.on('data', () => {
        expect(() => {
          response.setHeader('Content-Type', 'application/xml');
        }).to.throw('Cannot set headers after writing to the response.');
        done();
      });
    });

    it('should error on clear header once data is written to the pipe', (done) => {
      response.setHeader('Content-Type', 'application/json');

      inStream.end('chunk');
      outStream.on('data', () => {
        expect(() => {
          response.clearHeader('Content-Type');
        }).to.throw('Cannot set headers after writing to the response.');
        done();
      });
    });

    it('should lock statusCode once data is written to the pipe', (done) => {
      response.statusCode = 404;

      inStream.end('chunk');
      outStream.on('data', () => {
        expect(() => {
          response.statusCode = 405;
        }).to.throw('Cannot set statusCode after writing to the response.');
        done();
      });
    });

    it('should throw if you assign to body', () => {
      expect(() => {
        response.body = 'asdf';
      }).to.throw('Cannot set property');
    });
  });

  describe('#setBody', () => {
    let inStream;
    let outStream;

    beforeEach(() => {
      inStream  = new PassThrough();
      outStream = new PassThrough();
    });

    it('should pipe if the input is a readable stream', (done) => {
      inStream.end('hello world');

      response.setBody(inStream);
      response.body.pipe(outStream);

      outStream.on('data', (chunk) => {
        expect(chunk.toString()).to.equal('hello world');
        done();
      });
    });

    it('should .end to itself with the input value otherwise', () => {
      response.setBody('goodbye cruel world');
      response.body.pipe(outStream);

      outStream.on('data', (chunk) => {
        expect(chunk.toString()).to.equal('goodbye cruel world');
        done();
      });
    });

    it('should break piping from previous sources', (done) => {
      inStream.end('hello world');
      inStream.pipe(response.body);

      response.setBody('goodbye cruel world');
      response.body.pipe(outStream);

      outStream.on('data', (chunk) => {
        expect(chunk.toString()).to.equal('goodbye cruel world');
        done();
      });
    });
  });

});
