import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Device } from '@ionic-native/device';
import { Headers } from '@angular/http';
import { RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { Platform } from 'ionic-angular';
import { Storage } from '@ionic/storage';

/*

  CPQRestApiProvider
 ===================

  Endpoint Documentation
  https://docs.google.com/document/d/1LCuTjA7APZKDOhTxNDJkL717jDDchBgMnbeB-3JGR18/edit#heading=h.vqkpzodrluon

*/
@Injectable()
export class CPQRestApiProvider {


  private host;    // 

  private STUB_MODE;

  private userId;  // currently logged in user
  private rfst;    // The cross site request forgery verification parameter.
  private deviceId; // UUID of this device

  constructor(public platform: Platform,
              private storage: Storage,
              private sqlite: SQLite,
              private device: Device,
              public http: Http) {

    this.http = http;
    this.host = 'https://hybcpq.fpx.com/rs/18/';
    this.deviceId = this.device.uuid;

    //
    // STUB MODE - no communication with the server
    //
    this.STUB_MODE = false;

  }


  getUserId(){

    return this.userId;
    
  }


  //
  //
  //
  //  AUTHENTICATION
  //
  //
  //=======================================================================================

  /*

    Login

    * Authenticate user with CPQ Rest API

    @params    {
      username: (string) - username
      password: (string) - password
    }

    @returns    {
                    success: true,
                    message: {string} success message
                }

                on error
                {
                    success: false,
                    message: {string} error message
                }


    Documentation
    http://docs.fpx.com/docs/api/restful/18/#html/cpq_login_(post).html%3FTocPath%3DCPQ%2520OnDemand%2520Web%2520Services%2520API%2520Calls%2520(RESTful)%7C_____63

  */
  login(params){

    let uri = 'cpq/login';
    let body = {
      username: params.username,//'tomp@appnovation.com',
      password: params.password, //'test12345',
      device: this.deviceId
    };

    return new Promise(resolve => {

      this._post_request(uri, body).then(res => {

        let data: any = res;
        if(data.success){

          this.userId = data.userId;
          this.rfst = data.rfst;

          resolve({
            success: data.success,
            message: "Logged in Successfully"
          })
          
        }
        else{
          resolve({
            success: data.success,
            message: data.error
          })
        }

        resolve(res);

      });

    });

  }


  //
  //
  // CATALOGS
  //
  // https://docs.google.com/document/d/1LCuTjA7APZKDOhTxNDJkL717jDDchBgMnbeB-3JGR18/edit#
  //=======================================================================================


  getCatalogs(){

    if(this.STUB_MODE){
      // poc_data/catalogs-query.json
      let uri = 'catalogs-query.json';
      return this._stub_request_json(uri);
    }

    let uri = 'mobile/catalogs?search';
    return this._get_request(uri);

  }

  getCatalog(catalogId){

    if(this.STUB_MODE){
      // poc_data/catalog-xxa0000000000001.json
      let uri = 'catalog-'+catalogId+'.json';
      return this._stub_request_json(uri);
    }

    let uri = 'mobile/catalogs/'+catalogId;
    return this._get_request(uri);

  }

  getStatusForCatalogIds(catalogIds){

    let uri = 'mobile/catalogs/status';
    let body = {
      ids: catalogIds
    }

    return this._post_request(uri, body);

  }


  //
  //
  //
  //  DOWNLOAD / REFRESH
  //
  //
  //=======================================================================================


  getAccounts(){

    if(this.STUB_MODE){
      // poc_data/accounts-query.json
      let uri = 'accounts-query.json';
      return this._stub_request_json(uri);
    }

    let uri = 'cpqui?batchsize=100&pagenumber=1&query=Select+Name,AccountNumber,LastModifiedDate,Install_Country__c+From+Account+ORDER+BY+Id&resolve-names=true';
    return this._get_request(uri);

  }

  getOpportunities(){

    if(this.STUB_MODE){
      // poc_data/opportunities-query.json
      let uri = 'opportunities-query.json';
      return this._stub_request_json(uri);
    }

    let uri = 'cpqui?batchsize=100&pagenumber=1&query=Select+Name,AccountId,Status__c,Country__c,CurrencyIsoCode,LastModifiedDate,PrimaryQuoteId+From+Opportunity+ORDER+BY+LastModifiedDate+DESC&resolve-names=true';
    return this._get_request(uri);

  }

  getOpportunity(opportunityId){

    if(this.STUB_MODE){
      console.warn('No STUB for restApi.getOpportunity()');
      return;
    }

    return new Promise<any>(resolve => {

      let uri = 'cpqui?batchsize=100&pagenumber=1&query=Select+Name,AccountId,Status__c,Country__c,CurrencyIsoCode,LastModifiedDate,PrimaryQuoteId+From+Opportunity+WHERE+Id+%3D+%27'+opportunityId+'%27+ORDER+BY+LastModifiedDate+DESC&resolve-names=true';
      this._get_request(uri).then(res => {

        let data: any = res;
        if(data.records.length==1){
          resolve(data.records[0]);
        }

      });

    });

  }


  getQuotes(){

    if(this.STUB_MODE){
      // poc_data/quotes-query.json
      let uri = 'quotes-query.json';
      return this._stub_request_json(uri);
    }

    let uri = 'cpqui?batchsize=100&pagenumber=1&query=Select+Name,OpportunityId,FormattedId,IsPrimary,TotalAmount,LastModifiedDate,CurrencyIsoCode+From+quote+ORDER+BY+Id&resolve-names=true';
    return this._get_request(uri);

  }

  getQuote(quoteId){

    if(this.STUB_MODE){
      console.warn('No STUB for restApi.getQuote()');
      return;
    }

    return new Promise<any>(resolve => {

      let uri = 'cpqui?batchsize=100&pagenumber=1&query=Select+Name,OpportunityId,FormattedId,IsPrimary,TotalAmount,LastModifiedDate,CurrencyIsoCode+From+quote++WHERE+Id+%3D+%27'+quoteId+'%27+ORDER+BY+Id&resolve-names=true';
      this._get_request(uri).then(res => {

        let data: any = res;
        if(data.records.length==1){
          resolve(data.records[0]);
        }

      });

    });

  }

  getQuotelinesForQuoteId(quoteId){

    if(this.STUB_MODE){
      // poc_data/quotelines-query.json
      let uri = 'quotelines-query.json';
      return this._stub_request_json(uri);
    }

    let uri = 'cpqui?batchsize=100&pagenumber=1&query=Select+Quantity,Name,OrderCode,BaseListPrice,ParentQuoteId,CurrencyIsoCode,Product_Id,IsSelected,Product_ConfigDatabaseName+From+QuoteLine+WHERE+ParentQuoteId+%3D+%27'+quoteId+'%27+ORDER+BY+Sequence&resolve-names=true';
    return this._get_request(uri);

  }

  getImage(imageId){

    if(this.STUB_MODE){
      // poc_data/images/image-001
      let uri = 'images/'+imageId;
      return this._stub_request(uri);
    }

    let uri = 'mobile/images/'+imageId;
    return this._get_request(uri);

  }

  getImages(imageIds){

    let uri = 'mobile/images/search';
    let body = imageIds;
    return this._post_request(uri, body);

  }

  getObjectRetrieve(objectType, id){

    if(this.STUB_MODE){
      // poc_data/quote-retrieve.json
      let uri = objectType+'-retrieve.json';
      return this._stub_request_json(uri);
    }

    let uri = 'cpqui/'+id+'?resolve-names=true';
    return this._get_request(uri);

  }

  getObjectSummaryLayout(objectType, id){
    
    if(this.STUB_MODE){
      // poc_data/quote-summarylayout.json
      let uri = objectType+'-summarylayout.json';
      return this._stub_request_json(uri);
    }

    let uri = 'cpqui/layout?layoutType=summary_edit_layout&objectName='+objectType+'&uid='+id;
    return this._get_request(uri);

  }

  getObjectDescribe(ObjectType){

    let objectType = ObjectType.toLowerCase();
    if(this.STUB_MODE){
      // poc_data/quote-describe.json
      let uri = objectType+'-describe.json';
      return this._stub_request_json(uri);
    }

    let uri = 'objects/describe?objectTypes='+ObjectType;
    return this._get_request(uri);

  }

  //
  //
  // CREATE / COPY / SAVE OBJECTS
  // 
  //
  //=======================================================================================

  createObject(objectType, objectData){

    if(this.STUB_MODE){
      console.warn('No STUB for restApi.createObject(ObjectType, objectData)');
      return;
    }

    let uri = 'cpq';
    let body = objectData;
    body.type = objectType.charAt(0).toUpperCase() + objectType.slice(1);
    return this._post_request(uri, body);


  }

  createDefaultObject(objectType, objectData){

    if(this.STUB_MODE){
      console.warn('No STUB for restApi.createDefaultObject(ObjectType, objectData)');
      return;
    }

    let ObjectType = objectType.charAt(0).toUpperCase() + objectType.slice(1);
    if(objectType=='quoteline'){
      ObjectType = 'QuoteLine';
    }
    let uri = 'objects/'+objectType+'/default';
    let body = objectData;
    return this._post_request(uri, body);


  }

  copyObject(objectId){

    if(this.STUB_MODE){
      console.warn('No STUB for restApi.createObject(ObjectType, objectData)');
      return;
    }

    let uri = 'cpq/'+objectId+'/copy?isdeepcopy=false';
    let body = {};
    return this._put_request(uri, body);

  }

  updateObject(objectId, objectData){


    if(this.STUB_MODE){
      console.warn('No STUB for restApi.updateObject(id, objectData)');
      return;
    }

    let uri = 'cpq/'+objectId;
    let body = objectData;
    return this._put_request(uri, body);

  }





  //
  //
  //
  //  ACQUIRE / RELEASE LOCK
  //
  // https://docs.google.com/document/d/1LCuTjA7APZKDOhTxNDJkL717jDDchBgMnbeB-3JGR18/edit#
  //=======================================================================================

  acquireLockForQuoteId(quoteId){

    let uri = 'cpq/'+quoteId;
    let body = {
      isLocked: true
    }
    return this._put_request(uri, body);

  }

  releaseLockForQuoteId(quoteId){

    let uri = 'cpq/'+quoteId;
    let body = {
      isLocked: false
    }
    return this._put_request(uri, body);
  }

  verifyLocks(){

    let uri = 'cpq?query=SELECT+Id%2C+IsLocked+FROM+Quote+WHERE+IsLocked%3Dtrue';
    return this._get_request(uri);

  }

  releaseAllLocks(){

  }






  //
  //
  //
  //  INTERNAL PRIVATE METHODS
  //
  //
  //=======================================================================================

  _post_request(uri, body){

    let url = this.host + uri;

    return new Promise(resolve => {

      let headers = new Headers();
      headers.append('Content-Type', 'application/json;charset=UTF-8');
      let options = new RequestOptions({ headers: headers, withCredentials: true  });

      this.http.post(url, body, options)
        .map(res => res.json())
        .subscribe(res => {
          resolve(res);
        }, err => {
          resolve({
            success: false,
            message: JSON.parse(err._body)[0].context.error,
            error: JSON.parse(err._body)[0] 
          });  
        });

    });

  }

  _get_request(uri){

    let url = this.host + uri;

    return new Promise((resolve, reject) => {

      let headers = new Headers();
      headers.append('Content-Type', 'application/json;charset=UTF-8');
      let options = new RequestOptions({ headers: headers, withCredentials: true  });

      this.http.get(url, options)
        .map(res => res.json())
        .subscribe(res => {
          resolve(res);
        }, err => {
          resolve({
            success: false,
            message: JSON.parse(err._body)[0].context.error,
            error: JSON.parse(err._body)[0] 
          });  
        });

    });

  }

  _put_request(uri, body){

    let url = this.host + uri;

    return new Promise((resolve, reject) => {

      let headers = new Headers();
      headers.append('Content-Type', 'application/json;charset=UTF-8');
      let options = new RequestOptions({ headers: headers, withCredentials: true  });

      this.http.put(url, body, options)
        .map(res => res.json())
        .subscribe(res => {
          resolve(res);
        }, err => {
          resolve({
            success: false,
            message: JSON.parse(err._body)[0].context.error,
            error: JSON.parse(err._body)[0] 
          });    
        });

    });

  }

  _stub_request_json(uri){

    return new Promise((resolve, reject) => {

      this.http.get('assets/poc_data/'+uri)
        //.map(res => res.json())
        .subscribe((res: any) => {

          let data: any = res.json();
          resolve(data);

        }, err => {
          resolve({
            success: false,
            message: JSON.parse(err._body)[0].context.error,
            error: JSON.parse(err._body)[0] 
          });    
        });
    });

  }

  _stub_request(uri){

    return new Promise(resolve => {

      this.http.get('assets/poc_data/'+uri)
        .subscribe((res: any) => {

          resolve(res);

        });
    });

  }


}