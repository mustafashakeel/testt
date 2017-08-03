import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { Platform } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { CPQRestApiProvider } from '../cpq-rest-api/cpq-rest-api';

/*

  DBAdaptorProvider
 ===================

  * Loads sample data objects from assets/poc_data/*.json

  * Maintains Index of objects for querying - with keyword search capability

  * Uses Ionic Storage for underlying data store
    https://ionicframework.com/docs/storage/
      - WebSQL/IndexedDB in browser
      - SQLite on iOS/Android

*/
@Injectable()
export class DBAdaptorProvider {

  // database index
  public index;
  public sortIndexConfig;
  public keywordIndexConfig;


  public bytesInStorage;
  public isBatchMode;

  constructor(public platform: Platform,
              private storage: Storage,
              private sqlite: SQLite,
              public http: Http) {

    this.bytesInStorage = 0;

    this.index = {
      'all-account': {},          // all
      'all-opportunity': {},      // all
      'all-quote': {},            // all
      'all-catalog': {},
      'all-quoteline': {},
      'all-catalog-productgroup': {},
      'all-catalog-optiongroup': {},
      'sort-account-lastModifiedDate': {},     // sort index
      'sort-opportunity-lastModifiedDate': {}, // sort index
      'sort-quote-lastModifiedDate': {},       // sort index
      'keyword-account': {},      // keyword index
      'keyword-opportunity': {},  // keyword index
      'keyword-quote': {},        // keyword index
      'keyword-quoteline': {}        // parent id index

    }

    this.sortIndexConfig = {
      'account': ['LastModifiedDate'],
      'opportunity': ['LastModifiedDate'],
      'quote': ['LastModifiedDate']
    }

    this.keywordIndexConfig = {
      'account': ['Name'],
      'opportunity': ['AccountId.Name','Name','PrimaryQuoteId.Name'],
      'quote': ['Name','opportunityId'],
      'quoteline': ['quoteId']
    }
    
    this.storage.get('bytesInStorage').then(res => {
      this.bytesInStorage = (res)? res: 0;
    });

    this.isBatchMode = true;

  }

  initDatabase(){

    console.log('initDatabase');

    return new Promise(resolve => {
      this.loadIndexes().then(res => {
        resolve(true);
      })
    });

  }

  initSampleDatabase(){

    console.log('initSampleDatabase');
    return new Promise(resolve => {

      this.loadSampleData().then(res => {
        this.updateIndexes().then(res => {
          this.saveIndexes().then(res => {
            resolve();
          });
        });
        
      })

    });

  }

  startBatch(){
    this.isBatchMode = true;
  }

  finishBatch(){
    this.isBatchMode = false;
  }

  getBytesInStorage(){
    return this.bytesInStorage;
  }


  //
  //
  // LOCAL QUERY ENGINE
  //

  queryItems(objectType, expr){

    let ps = [];
    let all_index = this.index['all-'+objectType];

    //let ids = all_index;
    let ids_result = [];
    let resultHasId = {};

    //
    // keyword query
    //
    if(expr.keywordIndex && expr.keywordQuery){


      let keyword_i = this.index[expr.keywordIndex];

      let keyword, keyword_index, itemId;
      let qtoks = expr.keywordQuery.toLowerCase().split(' ');
      for(var q=0; q<qtoks.length; q++){

        keyword = qtoks[q];
        keyword_index = keyword_i[keyword];
        if(keyword_index){
          // keyword found in index

          for(var i=0; i<keyword_index.length; i++){
            itemId = keyword_index[i];

            // UNION of keywords
            resultHasId[itemId] = true;
            //if(ids.indexOf(itemId) == -1){
            //  ids.push(itemId);
            //}
          }
        }

      }

    }
    else{
      //for(var i=0; i<all_index.length; i++){
      for(let key in all_index){
        resultHasId[key] = true;
      }
    }

    //
    // Apply sortIndex if applicable
    //
    if(expr.sortIndex){

      let sort_i = this.index[expr.sortIndex];
      //for(var i=0; i<sort_i.length; i++){
      for(let itemId in sort_i){

        if(resultHasId[itemId]){
          ids_result.push(itemId);
        }

      }

    }
    else{

      for(let id in resultHasId){
        ids_result.push(id);
      }

    }

    //
    // Apply offset/limit if applicable
    //
    if(expr.offset){
      ids_result = ids_result.splice(expr.offset);
    }
    else{
      expr.offset = 0;
    }

    if(expr.limit){
      ids_result = ids_result.splice(0, expr.limit);
    }






    //
    // Resolve result items
    //
    let result = [];
    for(var i=0; i<ids_result.length; i++){

      // resolve item
      ps.push(this.storage.get(objectType+':'+ids_result[i]));

    }

    return new Promise<any[]>(resolve => {

      Promise.all(ps).then(function(result){
        resolve(result);
      });

    });
  }

  loadItem(objectType, id){
    console.warn('DEPRECATED method loadItem in DBAdaptorProvider.  Use loadItemFromLocal instead.');
    return this.loadItemFromLocal(objectType, id);
  }

  loadItemFromLocal(objectType, id){

    return new Promise<any>(resolve => {
      // try local storage

      let key = (id)? objectType+':'+id: objectType;

      this.storage.get(key).then(result => {

        resolve(result);

      });

    });
  }

  removeItemFromLocal(objectType, id){

    return new Promise<any>(resolve => {
      // try local storage

      let key = (id)? objectType+':'+id: objectType;

      this.loadItemFromLocal(objectType, id).then(item => {

        let str_item = JSON.stringify(item);

        this.bytesInStorage -= str_item.length;

        this.storage.set('bytesInStorage', this.bytesInStorage);

        this.storage.remove(key).then(result => {
          console.log('removed '+key);

          // remove from index
          if(this.index['all-'+objectType] && id){
            delete this.index['all-'+objectType][id];
          }

          resolve(result);
          //console.warn('TODO dbadaptor.removeItemFromLocal should actually remove data');
          //resolve(true);
        });

      });

    });
  }

  saveItemToLocal(objectType, id, item, doUpdateIndex=false){

    return new Promise<any>(resolve => {
      // try local storage

      let storage_key = (id)? objectType+':'+id: objectType;

      let str_item = JSON.stringify(item);

      this.storage.set(storage_key, item).then(result => {

        this.bytesInStorage += str_item.length;
        this.storage.set('bytesInStorage', this.bytesInStorage);

        if(!this.index['all-'+objectType]){
          this.index['all-'+objectType] = {};
        }

        // add to index
        if(id){
          this.index['all-'+objectType][id] = 1;
        }

        if(this.isBatchMode && !doUpdateIndex){
          // in Batch Mode - indexes are updated at the end with an explicit call
          // and then batchMode is turned off
          resolve(result);
        }
        else{
          // in Normal Mode - index is updated after every insertion (slower)
          this.updateIndexesForObjectType(objectType).then(res =>{
            resolve(result);
          });
        }
      });

    });

  }

  //
  // object copy, generate id
  //

  generateLocalId(obj){
    obj.Id = 'local-'+Math.random();
  }

  cloneObject(obj, userId){
    let clone = JSON.parse(JSON.stringify(obj));

    let nowDate = new Date().toISOString();

    clone.LocalClonedFromId = clone.Id;
    clone.CreatedById = userId;
    clone.CreatedDate = nowDate;
    clone.LastModifiedById = userId;
    clone.LastModifiedDate = nowDate;
    clone.Id = 'local-'+Math.random();

    return clone;
  }




  //
  //
  //


  //
  //
  // INDEXING LOCAL DATA
  //
  //

  loadIndexes(){

    return new Promise(resolve => {
      let ps = [];
      for(let indexName in this.index){
        if(!this.index.hasOwnProperty(indexName)) continue;
        ps.push(this.loadIndex(indexName));
      }

      Promise.all(ps).then(result => {
        resolve(result);
      });
    });

  }

  saveIndexes(){

    return new Promise(resolve => {
      let ps = [];
      for(let indexName in this.index){
        if(!this.index.hasOwnProperty(indexName)) continue;
        ps.push(this.saveIndex(indexName));
      }

      Promise.all(ps).then(result => {
        resolve(result);
      });
    });

  }

  loadIndex(indexName){

    return new Promise(resolve => {

      this.loadItemFromLocal('index', indexName).then(res => {

        if(res){ 
          this.index[indexName] = res;
        }
        resolve(this.index[indexName]);

      });

    });

  }

  saveIndex(indexName){

    let indexData = this.index[indexName];
    return new Promise(resolve => {

      if(!indexData){
        resolve(true);
        return;
      }

      this.saveItemToLocal('index', indexName, indexData).then(res => {

        resolve(res);

      });

    });

  }

  updateIndexes(){

    let ps = [];

    return new Promise(resolve => {

      //ps.push(this.updateIndexesForObjectType('account'));
      ps.push(this.updateIndexesForObjectType('opportunity'));
      ps.push(this.updateIndexesForObjectType('quote'));
      ps.push(this.updateIndexesForObjectType('quoteline'));
      
      Promise.all(ps).then(res => {
        resolve();
      });
    });

  }

  updateCatalogIndexes(){

    let ps = [];

    return new Promise(resolve => {

      ps.push(this.updateIndexesForObjectType('catalog'));
      //ps.push(this.updateIndexesForObjectType('catalog'));
      //ps.push(this.updateIndexesForObjectType('catalog'));
      
      Promise.all(ps).then(res => {
        resolve();
      });
    });

  }

  updateIndexesForObjectType(objectType){

    let ps = [];

    let sortConfig = this.sortIndexConfig[objectType];
    let keywordConfig = this.keywordIndexConfig[objectType];
    let column;

    return new Promise(resolve => {

      if(sortConfig){
        for(let i=0; i<sortConfig.length; i++){
          column = sortConfig[i];
          ps.push(this.updateSortIndex('sort-'+objectType+'-'+column, objectType, column));
        }
      }

      if(keywordConfig){
        ps.push(this.updateKeywordIndex('keyword-'+objectType, objectType, keywordConfig));
      }

      ps.push(this.saveIndex('all-'+objectType));

      Promise.all(ps).then(res => {
        resolve();
      });

    });

  }

  // update index sorted by objectType.column
  updateSortIndex(indexName, objectType, column){

    return new Promise(resolve => {
      // for each object of objectType
      let index = [];
      let itemId, item;
      let ps = [];
      let all = this.index['all-'+objectType];
      //for(var i=0; i < all.length; i++){
      for(let key in all){

        // load object from Storage / SQLite
        //ps.push(this.storage.get('retrieve-'+objectType+':'+itemId));
        ps.push(this.storage.get(objectType+':'+key));

        // sort by value

      }

      Promise.all(ps).then(items => {

        for(var j=0; j < items.length; j++){
          if(items[j] != null){
            // if item is available locally
            index.push({ id: items[j].Id, value: items[j][column] });
          }
          else{
            // must retrieve item from server
            // TODO
          }
        }

        // sort index by value descending
        index.sort(function(a, b) {
          return a.value - b.value;
        });

        //this.index[indexName] = index;

        if(!this.index[indexName]){
          this.index[indexName] = {};
        }
        for(let key in index){
          this.index[indexName][index[key].id] = 1;
        }

        // save INDEX to Storage/SQLite
        //this.storage.set('index-'+indexName, index);
        this.saveIndex(indexName).then(res => {
          resolve(true);
        });

      });

    });

  }

  // update index listing all keywords found in paths in objectType, as defined by
  // columns[0], columns[1], ...
  //
  // columns: ['name', 'person.dob']
  //
  // DATA:
  //  { id: 'id0', name: "WordA", person: { dob: "DOB-a"} },
  //  { id: 'id1', name: "WordB" },
  //  { id: 'id2', name: "WordA", person: { dob: "DOB-a"} },
  //  { id: 'id3', name: "WordA", person: { dob: "DOB-c"} },
  //
  // INDEX:
  // {
  //    "WordA": ['id0', 'id2', 'id3'],
  //    "WordB": ['id2']
  //    "DOB-a": ['id0', 'id2']
  //    "DOB-c": ['id3']
  //    ...
  // }
  //
  updateKeywordIndex(indexName, objectType, columns){

    return new Promise(resolve => {
      // find deep path in object
      // deepFind(item, "PrimaryQuoteId.Id")
      function deepFind(obj, path) {
        if(!path) return null;

        var paths = path.split('.')
          , current = obj
          , i;

        for (i = 0; i < paths.length; ++i) {
          if (current[paths[i]] == undefined) {
            return undefined;
          } else {
            current = current[paths[i]];
          }
        }
        return current;
      }

      // for each object of objectType
      let index = [];
      let itemId, item, columnVal, toks, keyword;
      let ps = [];
      let all = this.index['all-'+objectType];
      //for(var i=0; i < all.length; i++){
      for(let key in all){

        // load object from Storage / SQLite
        ps.push(this.storage.get(objectType+':'+key));
        //ps.push(this.storage.get(key));
      }

      Promise.all(ps).then(items => {

        for(var j=0; j < items.length; j++){
          if(items[j] != null){
            // if item is available locally
            
            item = items[j];

            for(var k=0; k < columns.length; k++){

              columnVal = deepFind(item, columns[k])
              if(columnVal){

                toks = columnVal.toString().split(' ');
                for(var t=0; t < toks.length; t++){

                  keyword = toks[t].toLowerCase();
                  if(!index[keyword]){
                    index[keyword] = [];
                  }

                  index[keyword].push(item.Id);
                }

              }

            }

          }
          else{
            // must retrieve item from server
            // TODO
          }
        }

        this.index[indexName] = index;
        
        // save INDEX to Storage/SQLite
        //this.storage.set('index-'+indexName, index);
        this.saveIndex(indexName).then(res => {
          resolve(true);
        });

      });

    });

  }



  //
  //
  // SAMPLE DATA
  //
  //

  loadSampleData(){

    return Promise.all([
      this.loadSampleQuery('accounts-query.json', 'account'),
      this.loadSampleQuery('opportunities-query.json', 'opportunity'),
      this.loadSampleQuery('quotes-query.json', 'quote'),

      this.loadSampleItem('account-retrieve.json', 'retrieve-account'),
      this.loadSampleItem('opportunity-retrieve.json', 'retrieve-opportunity'),
      this.loadSampleItem('quote-retrieve.json', 'retrieve-quote'),

      this.loadSampleItem('account-describe.json', 'describe-account'),
      this.loadSampleItem('opportunity-describe.json', 'describe-opportunity'),

      this.loadSampleItem('accounts-listlayout.json', 'listlayout-account'),
      this.loadSampleItem('opportunities-listlayout.json', 'listlayout-opportunity'),

      this.loadSampleItem('account-summarylayout.json', 'summarylayout-account'),
      this.loadSampleItem('opportunity-summarylayout.json', 'summarylayout-opportunity'),
      this.loadSampleItem('quote-summarylayout.json', 'summarylayout-quote'),

      this.loadSampleItem('catalog_359_HD_CAD_example.json', 'catalog'),
      this.loadSampleItem('catalog_359_HD_example.json', 'catalog'),
      this.loadSampleItem('catalog_579_HD_example.json', 'catalog'),
      this.loadSampleItem('catalog_torque_example.json', 'catalog')

    ]);

  }

  loadSampleQuery(fileName, objectType){

    let item;
    let index = this.index['all-'+objectType];

    return new Promise(resolve => {

      this.http.get('assets/poc_data/'+fileName)
        //.map(res => res.json())
        .subscribe((res: any) => {

          let data: any = res.json();
          
          let ps = [];

          this.bytesInStorage += res._body.length;

          for(var i=0; i<data.records.length; i++){
            item = data.records[i];

            if (index.indexOf(item.Id) == -1){
              index.push(item.Id);
            }

            // save record to Storage / SQLite
            //this.storage.set(objectType+':'+item.Id, item);
            ps.push(this.saveItemToLocal(objectType, item.Id, item));


          }

          // save INDEX to Storage/SQLite
          //this.storage.set('index-all-'+objectType, index);

          resolve(index);
        });
      });


  }

  loadSampleItem(fileName, objectType){

    let key;

    return new Promise(resolve => {

      this.http.get('assets/poc_data/'+fileName)
        //.map(res => res.json())
        .subscribe((res: any) => {

          let data: any = res.json();
          
          this.bytesInStorage += res._body.length;

          if(data.Id){
            data.id = data.Id;
          }
          //key = (data.id)? objectType+':'+data.id: objectType;

          // save record to SQLite
          //this.storage.set(key, data);
          this.saveItemToLocal(objectType, data.id, data).then(res => {
            resolve();
          });

        });
      });

  }

  //
  //
  //
  //



}