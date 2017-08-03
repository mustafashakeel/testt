import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Device } from '@ionic-native/device';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { Platform } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { ToastController } from 'ionic-angular';
import { DBAdaptorProvider } from '../db-adaptor/db-adaptor';
import { CPQRestApiProvider } from '../cpq-rest-api/cpq-rest-api';
import { AlertController } from 'ionic-angular';

/*
	Generated class for the LocalDataServiceProvider provider.

	See https://angular.io/docs/ts/latest/guide/dependency-injection.html
	for more info on providers and Angular 2 DI.
*/

/*
 
 LocalDataServiceProvider
 ========================
 
	* Delivers data to UI views
	
 */
export class User {
	username: string;
	password: string;
 
	constructor(username: string, password: string) {
		this.username = username;
		this.password = password;
	}
}



@Injectable()
export class LocalDataServiceProvider {
	//login
	currentUser: User;


	public ENABLE_TOAST = false;
	
	public settings: any = {};

	public cpqDrive_lastRefresh;
	public cpqDrive_checkedOutQuotes;

	public isLockedByQuoteId: any = {};
	
	// convert quoteline.Product_ConfigDatabaseName to a catalogId
	// "d865ebfa21fb0470:-496024c0:14ac0283bfb:-7e5c|0" --> xxa0000000000001
	private mapDatasetGuidToCatalogId: any = {};

	constructor(public platform: Platform,
							private storage: Storage,
							private sqlite: SQLite,
							public http: Http,
							private toastCtrl: ToastController,
							public dbAdaptor: DBAdaptorProvider,
							public restApi: CPQRestApiProvider,
							public alertCtrl: AlertController,
							private device: Device) {

		this.dbAdaptor = dbAdaptor;
		this.restApi = restApi;
		this.alertCtrl = alertCtrl;

		this.settings = { // APP starts as online to be able to comunicate to the server and get user credentials
			onlineMode: true,
			autoRefresh: false
		}
		this.cpqDrive_checkedOutQuotes = 0;

	 
	}


	initDatabase(){

		return new Promise(resolve => {

			this.initSettings().then(res => {

				this.dbAdaptor.initDatabase().then(res => {

					resolve(this.settings);

					/*
					this.dbAdaptor.loadItemFromLocal('lockedQuoteIds',null).then(lockedQuoteIds => {
						this.lockedQuoteIds = lockedQuoteIds;
					});
					*/
				});

			});
		});

	}


	isOnline(){
		return (this.settings && this.settings.onlineMode);
	}

	error_notOnline(){

		return new Promise(resolve => {
			resolve({
				success: false,
				message: "Must be in Online Mode to perform this action"
			});
		});

	}


	showToast(type, message) {

		if(!this.ENABLE_TOAST){
			return false;
		}

		if(!type){
			type = 'info';
		}

		let toast = this.toastCtrl.create({
			message: message,
			duration: 3000,
			position: 'top',
			cssClass: type
		});

		toast.onDidDismiss(() => {
			console.log('Dismissed toast');
		});

		toast.present();
	}

	getUserId(){

		return this.restApi.getUserId();

	}

	cloneObject(obj){

		let userId = this.restApi.getUserId();
		return this.dbAdaptor.cloneObject(obj, userId);

	}

	getCatalogFromDatasetGuid(datasetGuid){

		return new Promise(resolve => {

			this.getCatalogs().then(res => {

				let catalogs: any = res; 

				if(catalogs){
					for(var i=0; i<catalogs.length; i++){

						let catalog = catalogs[i];
						if(catalog.dataset && catalog.dataset.guid && catalog.dataset.guid==datasetGuid){
							resolve(catalog);
						}
					}
				}

			});

		});

	}

	/*
	initMapDatasetGuidToCatalogId(){

		var that = this;
		this.getCatalogs().then(res => {

			let catalogs: any = res; 
			let catalog: any; 
			let dataset: any;

			if(catalogs){
				for(var i=0; i<catalogs.length; i++){

					catalog = catalogs[i];
					dataset = catalog.dataset;
					if(dataset && dataset.guid){
						debugger;
						that.mapDatasetGuidToCatalogId[dataset.guid] = catalog.id;
					}
				}
			}

		});

	}
	*/

	//
	//
	//



	//
	//
	//
	//  REFRESH (DOWNLOAD & STORE) OBJECTS
	//
	//
	//=======================================================================================


	/**

		submits all product data to CPQ server to refresh product 
		configuration data. Only available in online mode. 

		Cases
		* Product Summary ONLINE

		Use Case
		* Read only, call refresh to pull down latest product data (refresh Quote)
			 (ie. if i have a read only copy locally (Offline with no lock), Refresh 
			 All will pull down latest)

	*/
	refreshAll(){

		if(!this.isOnline()){
			return this.error_notOnline();
		}


		this.showToast('info','Refreshing All for device '+this.device.uuid);

		return new Promise(resolve => {

			let promises = [];

			promises.push(this.refreshAllAccounts());
			promises.push(this.refreshAllOpportunities());

			Promise.all(promises).then(result => {
				
				// TP - Accounts/Opportunities must be done saving, before
				// we refresh Quotes. This is because Quote fields refer to Opportunity/
				// Account Ids, and unpackQuoteRetrieve resolves them locally to 
				// provide Opportunity Name, Account Name
				let promises_next = [];
				promises_next.push(this.refreshAllQuotes());
				promises_next.push(this.refreshAllCatalogs());

				Promise.all(promises_next).then(result => {
					resolve({
						success: true,
						message: "Refresh All Completed Successfully"
					});
					
				});

			});

		});

	}

	refreshAllCatalogs(){

		// TODO - ONLINE ONLY
		if(!this.isOnline()){
			return this.error_notOnline();
		}

		this.showToast('info','Refreshing All Catalogs');
		return new Promise(resolve => {

		 let promises = [];
			// load accounts from server
			this.restApi.getCatalogs().then(res => {

				let data: any = res;
				for(let i=0; i<data.records.length; i++){
					promises.push(this.refreshCatalog(data.records[i].id));
				}

			});

			Promise.all(promises).then(result => {

				resolve(true);

			});

		});

	}

	refreshAllAccounts(){

		if(!this.isOnline()){
			return this.error_notOnline();
		}

		this.showToast('info','Refreshing All Accounts');
		return this.refreshObjectsOfType('Account');

	}

	refreshAllOpportunities(){

		if(!this.isOnline()){
			return this.error_notOnline();
		}

		this.showToast('info','Refreshing All Opportunities');
		return this.refreshObjectsOfType('Opportunity');
	
	}

	refreshAllQuotes(){

		if(!this.isOnline()){
			return this.error_notOnline();
		}

		this.showToast('info','Refreshing All Quotes');

		this.isLockedByQuoteId = {};
		return new Promise(resolve => {
		

			this.restApi.verifyLocks().then(res => {

				let locks: any = res;
				for(var i=0; i<locks.records.length; i++){
					this.isLockedByQuoteId[locks.records[i].Id] = locks.records[i].IsLocked;
				}

				this.refreshObjectsOfType('Quote').then(res => {

					let data: any = res;
					let quote;
					let promises = [];

					for(var i=0; i<data.items.length; i++){

						quote = data.items[i];
						promises.push(this.refreshQuotelinesForQuoteId(quote.Id));

					}

					promises.push(this.refreshObjectDescribe('Quoteline'));

					Promise.all(promises).then(result => {

						this.dbAdaptor.updateIndexesForObjectType('quoteline').then(res => {

							resolve(true);
						
						});

					});

				});

			});

		});
	
	}


	refreshQuotelinesForQuoteId(quoteId){

		if(!this.isOnline()){
			return this.error_notOnline();
		}

		return new Promise(resolve => {

			// load accounts from server

			this.restApi.getQuotelinesForQuoteId(quoteId).then(res => {

				let data: any = res;
				let p1s = [];
				let objectItem;
				
				for(var i=0; i<data.records.length; i++){
					
					p1s.push(this._unpackQuoteline(data.records[i]));

				}

				Promise.all(p1s).then(objectItems => {

					let p2s = [];
					for(var i=0; i<objectItems.length; i++){
						objectItem = objectItems[i];
						p2s.push(this.dbAdaptor.saveItemToLocal('quoteline', objectItem.Id, objectItem));
					}
					

					Promise.all(p2s).then(result => {
						console.log('...saved '+result.length+' Quotelines');
						this.dbAdaptor.saveIndex('all-quoteline').then(res => {

							resolve({
								success: true,
								items: result,
								message: "Successfully refreshed "+result.length+" Quotelines"
							});

						});

					});

				});

			});

		});

	}

	refreshObjectsOfType(ObjectType, objectId=null){

		if(!this.isOnline()){
			return this.error_notOnline();
		}

		// TODO - ONLINE ONLY

		let ObjectTypePlural = (ObjectType=='Opportunity')? 'Opportunities': ObjectType+'s';

		let restApiRequest = (objectId)? 'get'+ObjectType: 'get'+ObjectTypePlural;
		let unpackMethod = '_unpack'+ObjectType;
		let objectType = ObjectType.toLowerCase();

		return new Promise(resolve => {

			// load from server
			this.restApi[restApiRequest](objectId).then(res => {

				debugger;
				let data: any = res;
				let promises = [];
				let objectItem;

				// unpack & save
				if(objectId){
					promises.push(this[unpackMethod](data));
				}
				else{
					for(var i=0; i<data.records.length; i++){
						promises.push(this[unpackMethod](data.records[i]));
					}
				}

				Promise.all(promises).then(objectItems => {

					let promises_save = [];
					let promises_alt = [];

					for(var i=0; i<objectItems.length; i++){

						// save to local & add to index[all-{objectType}]
						objectItem = objectItems[i];
						promises_save.push(this.dbAdaptor.saveItemToLocal(objectType, objectItem.Id, objectItem));

						promises_alt.push(this.refreshObjectRetrieveForId(ObjectType, objectItem.Id));
						promises_alt.push(this.refreshObjectSummaryLayoutForId(ObjectType, objectItem.Id));

					}

					Promise.all(promises_alt).then(result => {

						Promise.all(promises_save).then(result => {
							
							console.log('...saved '+result.length+' '+ObjectTypePlural);
								
							let ps = [];
							ps.push(this.dbAdaptor.saveIndex('all-'+objectType));
							ps.push(this.dbAdaptor.updateIndexesForObjectType(objectType));
							ps.push(this.refreshObjectDescribe(ObjectType));

							Promise.all(ps).then(res => {
								
								console.log('... updated indexes for '+objectType);
								
								resolve({
									success: true,
									items: result,
									message: "Successfully refreshed "+result.length+" "+ObjectTypePlural
								});

							});

						});

					});

				});


			});

		});

	}

	refreshObjectRetrieveForId(ObjectType, id){
 
		if(!this.isOnline()){
			return this.error_notOnline();
		}

		let unpackMethod = '_unpack'+ObjectType+'Retrieve';
		let objectType = ObjectType.toLowerCase();

		return new Promise(resolve => {

			// load accounts from server
			this.restApi.getObjectRetrieve(objectType, id).then(res => {

				let item: any = res;
				this[unpackMethod](item).then(res => {

					let objectItem: any = res;
					this.dbAdaptor.saveItemToLocal(objectType+'-retrieve', id, objectItem).then(res => {

						resolve(res);

					});

				});

			});

		});

	}

	refreshObjectDescribe(ObjectType){
 
		if(!this.isOnline()){
			return this.error_notOnline();
		}

		let objectType = ObjectType.toLowerCase();

		return new Promise(resolve => {

			// load accounts from server
			this.restApi.getObjectDescribe(ObjectType).then(res => {

				let objectItem: any = res;
				this.dbAdaptor.saveItemToLocal(objectType+'-describe', '', objectItem).then(res => {

					resolve(res);

				});

			});

		});

	}

	refreshObjectSummaryLayoutForId(ObjectType, id){
 
		if(!this.isOnline()){
			return this.error_notOnline();
		}

		let unpackMethod = '_unpack'+ObjectType+'SummaryLayout';
		let objectType = ObjectType.toLowerCase();

		return new Promise(resolve => {

			// load accounts from server
			this.restApi.getObjectSummaryLayout(objectType, id).then(res => {

				let item: any = res;
				this[unpackMethod](item).then(res => {

					let objectItem: any = res;
					this.dbAdaptor.saveItemToLocal(objectType+'-summarylayout', id, objectItem).then(res => {

						resolve(res);

					});

				});

			});

		});

	}


	refreshCatalog(catalogId){

		if(!this.isOnline()){
			return this.error_notOnline();
		}

		return new Promise(resolve => {

			// load accounts from server
			this.restApi.getCatalog(catalogId).then(res => {

				let data: any = res;
				let promises = [];
				let objectItem;

				this._unpackCatalog(catalogId, data).then(catalog => {

					let data: any = catalog;

					this.dbAdaptor.saveItemToLocal('catalog', data.id, data).then(res => {

							// save indexes
							this.dbAdaptor.updateCatalogIndexes().then(res => {

								console.log('...saved catalog '+catalogId);
								resolve({
									success: true,
									message: "Successfully saved Catalog "+catalogId
								});

							});

						});

					});

				});

			});

	}

	findUpdatedCatalogs(){

		return new Promise(resolve => {

      this.restApi.getCatalogs().then(data => {

        let res: any = data;
        let ids = [];
        for(var i=0; i<res.records.length; i++){
          ids.push(res.records[i].id);
        }

        this.restApi.getStatusForCatalogIds(ids).then(data => {

          let res: any = data;
          resolve(res);

        });

      });

    });

	}


	//
	// Convert object from CPQRestAPI -> LocalDataService format (simplify)
	// 

	_unpackAccount(item){

		let res = item;
		return new Promise(resolve => {
			
			res.country = res.Install_Country__c;
			res.lastModified = {
				'date': res.LastModifiedDate.substring(0,10),
				'time': res.LastModifiedDate.substring(11,19)
			}
			return resolve(res);

		});

	}

	_unpackAccountSummaryLayout(item){

		let res = item;
		return new Promise(resolve => {
			
			return resolve(res);

		});

	}

	_unpackAccountRetrieve(item){

		let res = item;
		return new Promise(resolve => {
			
				// Hardcoding response for Gartner demo
				res.OwnerId = 'Joe Smith';
				res.AccountId = 'Salient Solutions';
				res.InstallCountry = 'USA';
				res.Status = 'Forecast';

			return resolve(res);

		});

	}

	_unpackOpportunity(item){

		let res = item;
		return new Promise(resolve => {
			
			res.accountName = (res.AccountId)? res.AccountId.Name: "";
			res.lastModified = {
				'date': res.LastModifiedDate.substring(0,10),
				'time': res.LastModifiedDate.substring(11,19)
			}
			res.countryName = res.Country__c;
			res.status = res.Status__c;

			return resolve(res);

		});

	}

	_unpackOpportunitySummaryLayout(item){

		let res = item;
		return new Promise(resolve => {
			
			return resolve(res);

		});

	}

	_unpackOpportunityRetrieve(item){

		let res = item;
		return new Promise(resolve => {
			
			return resolve(res);

		});

	}

	_unpackQuote(item){

		let res = item;
		let that = this;
		return new Promise(resolve => {
				
			//res.accountName = (res.AccountId)? res.AccountId.Name: "";
			res.opportunityId = (res.OpportunityId)? res.OpportunityId.Id: "";
			res.opportunityName = (res.OpportunityId)? res.OpportunityId.Name: "";
			res.quoteName = res.Name;
			//res.status = res.Status__c;
			res.IsLocked = that.isLockedByQuoteId[res.Id];
			res._isCheckedOut = res.IsLocked;
			
			res.lastModified = {
				'date': res.LastModifiedDate.substring(0,10),
				'time': res.LastModifiedDate.substring(11,19)
			}

			/*
						if(!rows[i].status){
							rows[i].status = "Status";
						}

			*/
			return resolve(res);

		});

	}
	
	_unpackQuoteSummaryLayout(item){

		let res = item;
		return new Promise(resolve => {
			
			return resolve(res);

		});

	}

	_unpackQuoteRetrieve(item){

		let res = item;
		return new Promise(resolve => {
			
			if(res.OpportunityId){

				let opportunityId = (res.OpportunityId.Id)? res.OpportunityId.Id: res.OpportunityId;

				this.dbAdaptor.loadItemFromLocal('opportunity', opportunityId).then(data => {

					let opportunity: any = data;
					
					res.opportunityName = opportunity.Name;
					res.accountName = (opportunity.AccountId)? opportunity.AccountId.Name: '';
					res.OwnerId = "Joe Smith";

					res.quoteName = res.Name;
					res.ExpirationDate = res.ExpirationDate.substr(0,10);
					res.TotalAmount = '$'+res.TotalAmount;

					return resolve(res);

				});

			}
			else{

				// Quote not linked to Opportunity 
				res.opportunityName = '';
				res.accountName = '';
				res.OwnerId = "Joe Smith";

				res.quoteName = res.Name;
				res.ExpirationDate = res.ExpirationDate.substr(0,10);
				res.TotalAmount = '$'+res.TotalAmount;

				return resolve(res);
			}

		});

	}

	_unpackQuoteline(item){

		let res = item;
		return new Promise(resolve => {
			
			res.quoteId = (res.ParentQuoteId)? res.ParentQuoteId.Id: '';

			return resolve(res);

		});

	}

	_unpackCatalog(catalogId, data){

		let res = data;
		return new Promise(resolve => {
			
			let ps = [];
			let productGroup, optionGroup, item;

			// TODO - catalog needs country field
			if(res.currency=='CAD') res.country = 'Canada';
			if(res.currency=='USD') res.country = 'United States';

			for(let productGroupId in res.product_groups){

				productGroup = res.product_groups[productGroupId];
				productGroup.catalogId_productGroupId = catalogId+'-'+productGroup.id;

				// unpack
				productGroup.name = (!productGroup.name)? productGroup.description: productGroup.name;
				//

				ps.push(this.dbAdaptor.saveItemToLocal('catalog-productgroup', catalogId+'-'+productGroup.id, productGroup));

			}


			for(let optionGroupId in res.option_groups){

				optionGroup = res.option_groups[optionGroupId];
				optionGroup.catalogId_optionGroupId = catalogId+'-'+optionGroup.id;

				ps.push(this.dbAdaptor.saveItemToLocal('catalog-optiongroup', catalogId+'-'+optionGroup.id, optionGroup));

			}

			let imageIds = [];

			for(let itemId in res.items){

				item = res.items[itemId];
				item.catalogId_itemId = catalogId+'-'+item.id;

				if(item.image){
					imageIds.push(item.image);
				}

				ps.push(this.dbAdaptor.saveItemToLocal('catalog-item', catalogId+'-'+item.id, item));

			}


			Promise.all(ps).then(res => {

				// TODO - download images
				// this.restApi.getImages(imageIds).then(res => {
				// 		[
				//			{ id: '', name: '', bytes: '{base64data}'}
				//		]
				//	 for(var i=0; i<images.length; i++){
				//
				//		this.dbAdaptor.saveItemToLocal('image', imageId, image[i]);
				//	}
				//});

				return resolve(data);
			});


		});

	}

	_removeCatalog(catalogId, data){

		let res = data;
		return new Promise(resolve => {
			
			let ps = [];
			let productGroup, optionGroup, item;

			for(let productGroupId in res.product_groups){

				productGroup = res.product_groups[productGroupId];
				ps.push(this.dbAdaptor.removeItemFromLocal('catalog-productgroup', catalogId+'-'+productGroup.id));

			}


			for(let optionGroupId in res.option_groups){

				optionGroup = res.option_groups[optionGroupId];
				ps.push(this.dbAdaptor.removeItemFromLocal('catalog-optiongroup', catalogId+'-'+optionGroup.id));

			}

			for(let itemId in res.items){

				item = res.items[itemId];
				ps.push(this.dbAdaptor.removeItemFromLocal('catalog-item', catalogId+'-'+item.id));

			}

			Promise.all(ps).then(res => {
				return resolve(true);
			});

		});

	}


	//
	// Convert object from  LocalDataService -> CPQRestAPI format (simplify)
	// 
	_packAccount(item){

		let res = item;
		return new Promise(resolve => {
			
			return resolve(res);

		});

	}

	_packOpportunity(item){

		let res = item;
		return new Promise(resolve => {
			
			return resolve(res);

		});

	}

	_packQuote(item){

		let res = item;
		return new Promise(resolve => {
			
			return resolve(res);

		});

	}

	_packQuoteline(item){

		let res = item;
		return new Promise(resolve => {
			
			return resolve(res);

		});

	}

	_packCatalog(item){

		let res = item;
		return new Promise(resolve => {
			
			return resolve(res);

		});

	}

	//
	//
	//
	//  CREATE / MODIFY / REMOVE OBJECTS
	//
	//
	//=======================================================================================

	/**
		creates a new quote record for user to modify and add product(s). 
		A quote created in online mode will setup the quote record and 
		receive a quote ID. A quote created in offline mode will setup 
		the quote record and receive a quote ID during the online mode 
		check in process. 

		Cases
		* Opportunity Summary - Add Quote ONLINE & OFFLINE
	*/
	createQuote(){

		//  
		//  * DBA.createObject(‘quote’, {})
		//  if(isOnline)
		//  * DBA.createRemoteObject(‘quote’)
		//

		// SAMPLE OBJECT: see /poc_data/quote-retrieve.json

		/*
		this._doConfirmAction({

			actionText: "create quote",
			actionFn: function(){

				console.log('... is creating quote');

			}

		});

		*/
	}

	/** 

		links user to Select Catalog (offline mode) or Select Dataset (online mode). 

		API
		* if online, Add Product is another endpoint
		* if online, each step is a call to the server

		@param  quoteId   id of existing quote
		@param  product   hash object containing product

	*/
	addProductToQuote(quoteId, product){

		this.showToast('info','Adding Product to Quote');
		// * add item to quotelines

		// if ONLINE
		//  * addProductToQuote using WebService
		//
		// else
		//  * add quoteline 

		debugger;
    return new Promise<any>(resolve => {

			resolve({
				success: true,
				message: "Added product to quote "+quoteId
			});

    });

		/* SAMPLE OBJECT via /poc_data/quotelines-query.json
		{
			"Product_Id": "44a000012a6ijj3n",
			"OrderCode": "359_HD",
			"Quantity": 1,
			"IsSelected": true,
			"Id": "07a000012a6ijj3p",
			"CurrencyIsoCode": "USD",
			"Name": "359 Heavy Duty Standard",
			"BaseListPrice": 73257
		},
		*/


	}


	/**

		removes all associated account, opportunity and quote data (checked in and view only) 
		from local storage.  Users will be provided an alert to acknowledge removal of data. 

		Cases
		* Opportunity ONLINE / OFFLINE
		* Quote ONLINE / OFFLINE - also handle VIEW_ONLY quotes
		* Briefcase ONLINE / OFFLINE

		Edge Cases
		* checked out, someone else forced it to unlock - “Get latest list of Quote Locks” and show error
		* checked out, went offline, then removed quote - queue the item to release lock, and release lock next time online

		API
		* Release lock on the Object before removing from local storage

		UI Update
		* must show which object is checked out 

	 */
	removeObjectFromLocal(objectType, id){

		var that = this;
		/*
		this._doConfirmAction({

			actionText: "remove "+objectType+" "+id+" from Briefcase",
			actionFn: function(){

				that.showToast('info','Removing '+objectType+' from Briefcase');
				console.log('... is removing '+objectType+' '+id+' from local');

			}

		});
		*/
	}

	/** 

		removes product data from quote for selected product ID. Line is no longer 
		viewable on Products Summary. 

		Cases
		* Product Summary OFFLINE & ONLINE

		API
		* if ONLINE, endpoint for remove product from quote

	*/
	removeProductFromQuote(quoteId, productId){

		this.showToast('info','Removing Product from Quote');

	}


	/**

		removes all catalog product data from local storage. 

		Cases
		* Product Catalogs ONLINE & OFFLINE
	
	*/
	removeCatalogFromLocal(catalogId){

		return new Promise(resolve => {

			// load accounts from server
			this.dbAdaptor.loadItemFromLocal('catalog', catalogId).then(res => {

				let data: any = res;
				let promises = [];
				let objectItem;

				if(!res){
					resolve({
						success: false,
						message: "Already removed Catalog "+catalogId
					});	
					return;
				}

				this._removeCatalog(catalogId, data).then(catalog => {

					let data: any = catalog;

					this.dbAdaptor.removeItemFromLocal('catalog', catalogId).then(res => {

							// save indexes
							this.dbAdaptor.updateCatalogIndexes().then(res => {

								console.log('...removed catalog '+catalogId);
								resolve({
									success: true,
									message: "Successfully removed Catalog "+catalogId
								});

							});

						});

					});

				});

			});

	}

	/**

		submits any modified quote data to server or offline local storage. Splash screen 
		provided to alert users when quote data is successfully updated. 

		Note
		* different API call than Check In
		* will just save the Quote header

	*/
	saveQuote(quoteId, quote, doSaveQuotelines=false){

		let ps: any = [];

		return new Promise(resolve => {
			this.updateObject('quote', quoteId, quote).then(res => {

				if(doSaveQuotelines){

					// load accounts from server
					this.getQuoteProducts(quoteId).then(res => {

						let quotelines: any = res;

						for(var i=0; i<quotelines.length; i++){

							// TPQTY
							//quotelines[i].Quantity = -5;
							
							if(quotelines[i].Id.substr(0,6)=='local-'){
								ps.push(this.createObject('quoteline', quotelines[i].Id, quotelines[i]));
							}
							else{
								ps.push(this.updateObject('quoteline', quotelines[i].Id, quotelines[i]));
							}

						}

						Promise.all(ps).then(data => {

							let res: any = data;
							let allOk = true;
							let errorItems: any = [];
							
							// check that all quotelines updated successfully
							for(var i=0; i<res.length; i++){
								allOk = allOk && res[i].success;
								if(!res[i].success){

									let label = (res[i].error.context.fields)? res[i].error.context.fields[0].field.label: res[i].error.context.error;
									let message = (res[i].error.context.fields)? res[i].message: '';
									errorItems.push({
										id: res[i].error.context.objectId,
										label: label,
										message: message
									});
								}
							}

							// if any quotelines have error, report it in error message
							if(allOk){
								resolve({
									success: true,
									message: "Successfully saved Quote"
								});		
							}
							else{
								resolve({
									success: false,
									message: "Quote could not be saved",
									errorItems: errorItems
								});
							}

						});


					});

				}
				else{
					resolve({
						success: true,
						message: "Successfully saved Quote"
					});
				}
			})

		});

	}



	/** 

		Save Object (quote, opportunity, account), 
		ensure only valid changes are included in deltaObject

	*/
	updateObject(objectType, objectId, objectData){

		return new Promise(resolve => {

			let deltaObject = {};

			this.getObjectDescribe(objectType).then(data => {

				let field: any = {};
				let fields: any = data;

				// field.updatable
				for(var i=0; i<fields.length; i++){
					field = fields[i];
					if(field.updateable && objectData[field.name]){
						deltaObject[field.name] = objectData[field.name];
					}
				}

				this.restApi.updateObject(objectId, deltaObject).then(data => {

					let res: any = data;
					if(res.error){
						resolve({
							success: false,
							message: res.message,
							error: res.error
						});

					}
					else{
						resolve({
							success: true,
							message: "Successfully saved "+objectType,
							changes: res.changes
						});

					}

				})

			});

		});

	}





	/** 

		Save Object (quote, opportunity, account), 
		ensure only valid changes are included in deltaObject

	*/
	createObject(objectType, objectId, objectData){

		return new Promise(resolve => {


			this.restApi.createDefaultObject('opportunity', { Name: "Opportunity for ABC Mfg" }).then(data => {

				let defaultObject: any = data;

				this.getObjectDescribe(objectType).then(data => {

					let field: any = {};
					let fields: any = data;

					// field.updatable
					for(var i=0; i<fields.length; i++){
						field = fields[i];
						if(field.updateable && objectData[field.name]){
							defaultObject[field.name] = objectData[field.name];
						}
					}
					//defaultObject.Id = objectData.Id;
					//delete defaultObject.Id;
					this.restApi.updateObject(defaultObject.Id, defaultObject).then(data => {

						let res: any = data;
						if(res.error){
							resolve({
								success: false,
								message: res.message,
								error: res.error
							});

						}
						else{
							resolve({
								success: true,
								message: "Successfully saved "+objectType,
								changes: res.changes
							});

						}

					})

				});

			});


		});

	}




	//
	//
	//
	//  DOWNLOAD / REFRESH / CHECK IN / CHECK OUT
	//
	//
	//=======================================================================================


	/**

		submits server request for available product model updates and links users 
		to the Update Products Changes screen. 

		Cases
		* Product Summary ONLINE

		API
		* currently available

		Notes
		* Underlying Product changes - can modify configuration requirements, 
		* Server Configurator will try to keep things valid - will update the 
		configuration automatically

		UI
		* Need screen for Update Products Changes
	
	*/
	checkUpdateAvailable(){

		this.showToast('info','Checking for Updates');

	}


	/**

		server call to check out and download all associated quote data for ability to 
		modify in offline quoting process and removes view only quote from local storage. 

		Cases
		* Quote ONLINE & VIEW_ONLY

		API
		* call Acquire Lock
		* download quote using retrieve-quote, etc.

	*/
	checkOutQuote(quoteId){

    return new Promise<any>(resolve => {

			//this.dbAdaptor.loadItemFromLocal('quote', quoteId).then(res => {
			this.restApi.getObjectRetrieve('quote', quoteId).then(res => {

				let quote: any = res;

				this.restApi.acquireLockForQuoteId(quoteId).then(data => {

					let res: any = data;
					if(res.error){

						return resolve({
							success: true,
							message: "Could not Check Out Quote. Locked by another user.",
							quote: quote
						});

					}
					else if(res.changes && res.changes.length==2){

						// download latest quote from server
						this.refreshQuote(quoteId).then(data => {

							// mark quote as checked out				
							let res: any = data;
							let quote: any = res.quote;
							quote._isCheckedOut = true;

							this.dbAdaptor.saveItemToLocal('quote', quoteId, quote).then(data => {

								resolve({
										success: true,
										message: "Successfully Checked Out Quote",
										quote: quote
								});

							});

						});

					}
					else{
						resolve({
								success: false,
								message: "Error. Quote already Checked Out.",
								quote: quote
						});
					}

				});

			});

		});

	}


	/**

		pushes checked out quote data to CPQ server and removes from local storage.

		Cases
		* Quote ONLINE & CHECKED_OUT

		Use case
		* Offline has lightweight configuration checks, so uploading a configuration, 
			server may return an error - X was not valid
		* Offline, select product 30 of option A, which skips validation, but server 
			returns error can
				- Option A - send online anyway, and give them an Web UI to fix the issues
				- Option B - UI Question
		* when server returns configuration errors, show them in a list, and tapping 
			item will jump to configuration screen, where change can be made

		QUESTION
		- can Option B be implemented by the Mobile app? Does the API have all the 
			capabilities? YES - smart UI is built on the same API.  
			Assume - we can release with a subset of the capabilities (Phone version 
			of the Smart UI).
		- can we share Angular elements of Smart UI (data services, etc), just make 
			different layouts.

		FPX TODO
		* Build Check in Endpoint

	*/
	checkInQuote(quoteId){

    return new Promise<any>(resolve => {

			//this.dbAdaptor.loadItemFromLocal('quote', quoteId).then(res => {
			this.restApi.getObjectRetrieve('quote', quoteId).then(res => {

				let quote: any = res;
				delete quote._isCheckedOut;

				// save latest quote to server
				this.saveQuote(quoteId, quote, true).then(data => {

					let res: any = data;
	        if(!res.success){
	        	res.message = 'Quote Could Not be Checked In Due to Configuration Error(s)';
	        	res.quote = quote;
	          resolve(res);
	        }
	        else{
						this.restApi.releaseLockForQuoteId(quoteId).then(data => {

							let res: any = data;
							if(res.changes && res.changes.length==2){

								// update local record
								quote.isLocked = false;

			        	// update quote in local (removed _isCheckedOut)
								this.dbAdaptor.saveItemToLocal('quote', quoteId, quote).then(data => {

									resolve({
											success: true,
											message: "Successfully Checked in Quote",
											quote: quote
									});

								});
							}
							else{
								resolve({
										success: false,
										message: "Error: Quote already Checked In.",
										quote: quote
								});
							}

						});

					}
				
				});

			});

		});

	}


	/**

		server call to download account and opportunity data for requested opportunity ID. 

		Cases
		* Briefcase ONLINE - when opportunity not available in Briefcase

		NOTES
		* Read only download, no locking
		* Opportunity is always read only, and quote can be created

	*/
	downloadOpportunityOnly(opportunityId){


		if(!this.isOnline()){
			return this.error_notOnline();
		}

		this.showToast('info','Downloading Opportunity');

		return new Promise(resolve => {

			this.refreshObjectsOfType('Opportunity', opportunityId).then(data => {

				resolve({
						success: true,
						message: "Successfully Downloaded Opportunity"
				});

			});

		});


	}


	/**

		downloads all product catalog data from CPQ server to local storage for use in 
		offline quoting. 

		Cases
		* Product Catalogs ONLINE - unfiltered to display catalogs available for download

	*/
	downloadCatalog(catalogId){

		if(!this.isOnline()){
			return this.error_notOnline();
		}

		return this.refreshCatalog(catalogId);

	}


	/**

		server call to refresh all associated account, opportunity and quote data. 

		Cases
		* Opportunity ONLINE


		Notes
		* last modified 

		* Auto-Refresh invokes this for every opportunity, periodically

	*/
	refreshViewOnly(opportunityId){

		if(!this.isOnline()){
			return this.error_notOnline();
		}

		return new Promise<any>(resolve => {

    	let ps = [];
    	this.getQuotes({
    		opportunityId: opportunityId
    	}).then(data => {

    		let quotes: any = data;
    		let quote: any = {};

    		for(var i=0; i<quotes.length; i++){

    			quote = quotes[i];
    			ps.push(this.refreshQuote(quote.Id));

    		}

    		Promise.all(ps).then(data => {

    			let res: any = data;
    			resolve({
    				success: true,
    				message: "Refreshed "+res.length+" Quotes"
    			});

    		});

    	})


    });


	}


	/**

		server call to refresh all associated account, opportunity and quote data.

		Cases
		* Quote ONLINE & VIEW_ONLY
	
	*/
	refreshQuote(quoteId){

		if(!this.isOnline()){
			return this.error_notOnline();
		}

		return new Promise(resolve => {
		
			this.refreshObjectsOfType('Quote', quoteId).then(data => {

				let res: any = data;
				let promises = [];
				let quote = res.items[0];

				promises.push(this.refreshQuotelinesForQuoteId(quoteId));
				promises.push(this.refreshObjectDescribe('Quoteline'));

				Promise.all(promises).then(result => {

					this.dbAdaptor.updateIndexesForObjectType('quoteline').then(res => {

						resolve({
							success: true,
							message: "Successfully Refreshed Quote",
							quote: quote
						});
					
					});

				});

			});

		});

	}





	//
	//
	//
	//  COPY SERVICES
	//
	//
	//=======================================================================================


	/**

		copies all quote summary data for selected quote and creates an offline quote 
		record. Does not copy any associated product data. Quote is available for editing 
		in offline mode. A quote record/quote ID will be created during the online mode 
		check in quote process.

		Cases
		* Briefcase OFFLINE & ONLINE - checked out quote available in Briefcase

		Notes
		* only copy the quote header info - leave the products empty (Copy Quote with 
			Products) is for copying all product configuration
	
	*/
	copyQuoteOnly(quoteId){

    return new Promise<any>(resolve => {

			this.dbAdaptor.loadItemFromLocal('quote', quoteId).then(data => {

				let quote: any = data;
				if(!quote){
					resolve({
							success: false,
							message: "Could not Copy Quote with Products"
					});
					return;

				}

				if(!quote._isCheckedOut){
					resolve({
							success: false,
							message: "Quote must be Checked Out to copy"
					});
					return;
				}

				// Copy Quote
				let quoteClone = this.cloneObject(quote);
				this.dbAdaptor.saveItemToLocal('quote', quoteClone.Id, quoteClone, true).then(res => {

					this.dbAdaptor.loadItemFromLocal('quote-retrieve', quoteId).then(data => {

						let quoteRetrieve: any = data;

						// Copy Quote Retrieve
						let quoteRetrieveClone = this.cloneObject(quoteRetrieve);
						quoteRetrieveClone.Id = quoteClone.Id;
						this.dbAdaptor.saveItemToLocal('quote-retrieve', quoteRetrieveClone.Id, quoteRetrieveClone, true).then(res => {

							// Copy Quote Summary Layout
							this.dbAdaptor.loadItemFromLocal('quote-summarylayout', quoteId).then(res2 => {

								let quoteSummaryLayout: any = res2;
								let quoteSummaryLayoutClone = this.cloneObject(quoteSummaryLayout);
								quoteSummaryLayoutClone.Id = quoteClone.Id;

								this.dbAdaptor.saveItemToLocal('quote-summarylayout', quoteSummaryLayoutClone.Id, quoteSummaryLayoutClone, true).then(res => {

									resolve({
											success: true,
											message: "Successfully Copied Quote"
									});

								});

							});

						});

					});

				});

			});

		});

	}


	/**

		copies all quote summary and product(s) data for selected quote and 
		creates an offline quote record. Quote is available for editing in offline mode. 
		A quote record/quote ID will be created during the online mode check in process.

		Cases
		* Briefcase OFFLINE - checked out quote available in Briefcase
		* Quote ONLINE - checked out quote

		Notes
		* when saving Quote, server will retrieve the new ID, and any error messages.  
		Just like doing a sync

	*/
	copyQuoteWithProducts(quoteId){

    return new Promise<any>(resolve => {

			this.dbAdaptor.loadItemFromLocal('quote', quoteId).then(data => {

				let quote: any = data;
				if(!quote){
					resolve({
							success: false,
							message: "Could not Copy Quote with Products"
					});
					return;
				}

				if(!quote._isCheckedOut){
					resolve({
							success: false,
							message: "Quote must be Checked Out to copy"
					});
					return;
				}

				// Copy Quote
				let quoteClone = this.cloneObject(quote);
				this.dbAdaptor.saveItemToLocal('quote', quoteClone.Id, quoteClone, true).then(res => {

					this.dbAdaptor.loadItemFromLocal('quote-retrieve', quoteId).then(data => {

						let quoteRetrieve: any = data;

						// Copy Quote Retrieve
						let quoteRetrieveClone = this.cloneObject(quoteRetrieve);
						quoteRetrieveClone.Id = quoteClone.Id;
						this.dbAdaptor.saveItemToLocal('quote-retrieve', quoteRetrieveClone.Id, quoteRetrieveClone, true).then(res => {

							// Copy Quote Summary Layout
							this.dbAdaptor.loadItemFromLocal('quote-summarylayout', quoteId).then(res2 => {

								let quoteSummaryLayout: any = res2;
								let quoteSummaryLayoutClone = this.cloneObject(quoteSummaryLayout);
								quoteSummaryLayoutClone.Id = quoteClone.Id;

								this.dbAdaptor.saveItemToLocal('quote-summarylayout', quoteSummaryLayoutClone.Id, quoteSummaryLayoutClone, true).then(res => {

									// Copy Quote Products
									this.getQuoteProducts(quoteId).then(data => {

										let ps = [];
										let quotelines: any = data;
										for (let quoteline of quotelines){

											// copy product
											let quotelineClone = this.cloneObject(quoteline);
											quotelineClone.quoteId = quoteClone.Id;

											ps.push(this.saveProduct(quoteClone.Id, quotelineClone));
										}

										Promise.all(ps).then(res => {

											resolve({
													success: true,
													message: "Successfully Copied Quote with Products"
											});

										});

									});

								});

							});

						});

					});

				});

			});

		});

	}


	/**

		copies all product data and creates a new product record on the selected quote ID. 

		Cases
		* Product Summary OFFLINE & ONLINE

		ONLINE
		* API for Copy Product

	*/
	copyProduct(quoteId, productId){

    return new Promise<any>(resolve => {

			this.getQuoteProducts(quoteId).then(data => {

				let quotelines: any = data;
				for (let quoteline of quotelines){
				//total += parseFloat(quoteline.BaseListPrice);
					if(quoteline.Product_Id==productId){

						// copy product
						let clone = this.cloneObject(quoteline);
						this.saveProduct(quoteId, clone).then(data => {
							resolve({
									success: true,
									message: "Successfully Copied Product"
							});
						});
						return;
					}			 
				}

				resolve({
						success: false,
						message: "Could not Copy Product"
				});
			});
		});

	}


	/**

	 saves product data, and creates a new product record on the selected quote

	*/
	saveProduct(quoteId, product){

		if(!product.Id){
			this.dbAdaptor.generateLocalId(product);
		}

		return this.dbAdaptor.saveItemToLocal('quoteline', product.Id, product, true);

	}








	//
	//
	//
	//  BATCH ACTIONS
	//
	//
	//=======================================================================================

	// see API/Refresh Query
	autoRefresh(){

	}

	/**

		pushes all checked out quote data to CPQ server and removes all associated 
		account, opportunity and quote data (checked out and view only) from local storage. 

		Cases
		* Opportunity ONLINE
		* Briefcase ONLINE - server call to check in and upload all associated checked 
		out quote data and removes all account, opportunity and quote data (checked out 
		and view only) from local storage. 

		API
		* batch of Check In Quote calls

		UI QUESTIONS
		* need UI for Check In (& Check in All)

	*/
	checkInAllQuotes(opportunityId){

    return new Promise<any>(resolve => {

    	// load all local quotes, and check in if _isCheckedOut
    	let ps = [];
    	this.getQuotes({
    		opportunityId: opportunityId
    	}).then(data => {

    		let quotes: any = data;
    		let quote: any = {};

    		for(var i=0; i<quotes.length; i++){

    			quote = quotes[i];

    			if(quote._isCheckedOut){

    				ps.push(this.checkInQuote(quote.Id));

    			}

    		}

    		Promise.all(ps).then(data => {

    			let res: any = data;
    			let allOk: boolean = true;
    			let errorItems: any = [];
    			let numOk = 0;
    			for(var i=0; i<res.length; i++){

    				allOk = allOk && res[i].success;
    				if(!res[i].success){
    					errorItems.push({
    						id: res[i].quote.Id,
    						quote: res[i].quote,
    						message: res[i].message
    					});
    				}
    				else{
    					numOk++;
    				}

    			}
    			
    			if(allOk){

	    			resolve({
	    				success: true,
	    				message: "Checked In "+numOk+" of "+res.length+" Quotes"
	    			});

    			}
    			else{

	    			resolve({
	    				success: false,
	    				message: "Checked In "+numOk+" of "+res.length+" Quotes",
	    				errorItems: errorItems
	    			});

    			}

    		});

    	})


    });


	}


	/**

		server call to download data for account, opportunity and all quotes for 
		requested opportunity ID. Downloaded data is view only. 

		Cases
		* Briefcase ONLINE - when opportunity not available in Briefcase

		API
		* no api to specifically mark read-only - app will track read-only objects

		Use case
		* upload a quote, didnt have a lock (as its new)

	*/
	downloadAllQuotesReadOnly(opportunityId){

		return new Promise<any>(resolve => {

    	let ps = [];
    	this.getQuotes({
    		opportunityId: opportunityId
    	}).then(data => {

    		let quotes: any = data;
    		let quote: any = {};

    		for(var i=0; i<quotes.length; i++){

    			quote = quotes[i];
    			ps.push(this.refreshQuote(quote.Id));

    		}

    		Promise.all(ps).then(data => {

    			let res: any = data;
    			resolve({
    				success: true,
    				message: "Downloaded "+res.length+" Quotes Read Only"
    			});

    		});

    	})


    });

	}


	/**

		server call to download account, opportunity and all quotes for requested 
		opportunity ID. CPQ will set a ‘lock’ on all checked out quotes and 
		quotes are only editable within the CPQ Mobile App in offline mode. 

		Cases
		* Briefcase ONLINE - when opportunity not available in Briefcase

		Notes
		* Attempt to check out all quotes, and take whatever quotes succeed - 
		report that N quotes were already locked

		API
		* in getQuotes call, add field for isLocked/lockedBy

		TODO
		* determine size of UDID device identifier (32 or 40bytes?)

	*/
	checkOutAllQuotes(opportunityId){

		return new Promise<any>(resolve => {

    	let ps = [];
    	this.getQuotes({
    		opportunityId: opportunityId
    	}).then(data => {

    		let quotes: any = data;
    		let quote: any = {};

    		for(var i=0; i<quotes.length; i++){

    			quote = quotes[i];
    			ps.push(this.checkOutQuote(quote.Id));

    		}

    		Promise.all(ps).then(data => {

    			let res: any = data;
    			let allOk: boolean = true;
    			let errorItems: any = [];
    			let numOk = 0;
    			for(var i=0; i<res.length; i++){

    				allOk = allOk && res[i].success;
    				if(!res[i].success){
    					errorItems.push({
    						id: res[i].quote.Id,
    						quote: res[i].quote,
    						message: res[i].message
    					});
    				}
    				else{
    					numOk++;
    				}

    			}

    			if(allOk){

	    			resolve({
	    				success: true,
	    				message: "Checked Out "+numOk+" of "+res.length+" Quotes"
	    			});

    			}
    			else{

	    			resolve({
	    				success: false,
	    				message: "Checked Out "+numOk+" of "+res.length+" Quotes",
	    				errorItems: errorItems
	    			});

    			}

    		});

    	})


    });


	}






	//
	//
	//
	//  GET OBJECTS and CONTENT for APP PAGES
	//
	//
	//=======================================================================================

	// To get accounts
	getAccounts() {

		return new Promise(resolve => {

			let params: any = {};
			// params.filterOptionValues = {
				
			//   // radio select options:
			//   //   expiredCatalogs
			//   //   expiredQuotes
			//   //   checkedOut
			//   //   viewOnly
			//   'quotes': 'expiredCatalogs', 

			//   // radio select options:
			//   //   today
			//   //   last7Days
			//   //   last30Days
			//   'dateModified': null,

			//   'currency': "USD",
			//   'owner': null,
			//   'status': null
			// }

			let objectType = 'account';

			this.dbAdaptor.queryItems(objectType, params).then(results => {

				let rows: any[] = results;

				// TODO - remove filter stub
				if(params && params.filterOptionValues){
					resolve(rows.splice(0,3));
				}
				else{
					resolve(rows);
				}

			});


		});

		/*
		return new Promise(resolve => {

			let res = [{
				name: 'Account Name 1',
				isOffline: true,
				country: 'USA',
				id: 1234
			}, {
				name: 'Account Name 2',
				isOffline: false,
				country: 'PRINCIPALITY OF SEALAND',
				id: 1235
			}];


			resolve(res);

		});
		*/
	}

	getAccountSummary(id) {

		return new Promise(resolve => {

			this.dbAdaptor.loadItemFromLocal('account-retrieve', id).then(result => {

				resolve(result);

			});
		
		});

	}

	getOpportunities(options: any){

		return new Promise(resolve => {

			// options.filterOptionValues
				
			//   // radio select options:
			//   //   expiredCatalogs
			//   //   expiredQuotes
			//   //   checkedOut
			//   //   viewOnly
			//   'quotes': 'expiredCatalogs', 

			//   // radio select options:
			//   //   today
			//   //   last7Days
			//   //   last30Days
			//   'dateModified': null,

			//   'currency': "USD",
			//   'owner': null,
			//   'status': null
			//
			let objectType = 'opportunity';
			let params: any = {};

			if(options && options.opportunityId){
				params = {
					keywordIndex: 'keyword-opportunity',
					keywordQuery: options.opportunityId
				}
			}
			if(options && options.query){
				params = {
					keywordIndex: 'keyword-opportunity',
					keywordQuery: options.query
				}
			}

			let filterCheckedOut = function(item){
				return item._isCheckedOut;
			}
			let filterViewOnly = function(item){
				return item._isViewOnly;
			}
			let filterExpiredQuotes = function(item){
				return true;
			}
			let filterExpiredCatalogs = function(item){
				return true;
			}
			let filterModifiedToday = function(item){
				return true;
			}
			let filterModifiedLast7Days = function(item){
				return true;
			}
			let filterModifiedLast30Days = function(item){
				return true;
			}


			this.dbAdaptor.queryItems(objectType, params).then(results => {

				let rows: any[] = results;
				if(options && options.filterOptionValues){

					if(options.filterOptionValues.quotesParameter){
						for(var i=0; i<options.filterOptionValues.quotesParameter.length; i++){
							switch(options.filterOptionValues.quotesParameter[i]){
								case 'viewOnly': rows = rows.filter(filterViewOnly); break;
								case 'checkedOut': rows = rows.filter(filterCheckedOut); break;
								case 'expiredQuotes': rows = rows.filter(filterExpiredQuotes); break;
								case 'expiredCatalogs': rows = rows.filter(filterExpiredCatalogs); break;
							}
						}
					}

					resolve(rows);
				}
				else{
					resolve(rows);
				}
			});

		});
	}


	getOpportunitySummary(id) {

		return new Promise(resolve => {

			this.dbAdaptor.loadItemFromLocal('opportunity-retrieve', id).then(result => {

				resolve(result);

			});
					
		});

	}

	/*
	getOpportunitySummaryFields(id) {

		return new Promise<any[]>(resolve => {

			this.dbAdaptor.loadItemFromLocal('opportunity-summarylayout', id).then(result => {

				let column;
				let res = [];
				let rows = result.pageLayout.pageLayoutSections[0].rows;
				for(var i=0; i<rows.length; i++){

					column = rows[i].columns[0];

				}

				resolve(res);

			});

		});

	}
	*/
	getQuotes(options: any = null){

		let that = this;
		return new Promise(resolve => {

			// options.filterOptionValues
				
			//   // radio select options:
			//   //   expiredCatalogs
			//   //   expiredQuotes
			//   //   checkedOut
			//   //   viewOnly
			//   'quotes': 'expiredCatalogs', 

			//   // radio select options:
			//   //   today
			//   //   last7Days
			//   //   last30Days
			//   'dateModified': null,

			//   'currency': "USD",
			//   'owner': null,
			//   'status': null
			//
			let objectType = 'quote';
			let params: any = {};

			if(options && options.opportunityId){
				params = {
					keywordIndex: 'keyword-quote',
					keywordQuery: options.opportunityId
				}
			}
			if(options && options.query){
				params = {
					keywordIndex: 'keyword-quote',
					keywordQuery: options.query
				}
			}

			let filterCheckedOut = function(item){
				return item._isCheckedOut;
			}
			let filterViewOnly = function(item){
				return item._isViewOnly;
			}
			let filterExpiredQuotes = function(item){
				return true;
			}
			let filterExpiredCatalogs = function(item){
				return true;
			}
			let filterModifiedToday = function(item){
				return true;
			}
			let filterModifiedLast7Days = function(item){
				return true;
			}
			let filterModifiedLast30Days = function(item){
				return true;
			}


			let queryLocal = function(){

				that.dbAdaptor.queryItems(objectType, params).then(results => {

					let rows: any[] = results;
					// TODO - remove filter stub
					if(options && options.filterOptionValues){

						if(options.filterOptionValues.quotesParameter){
							for(var i=0; i<options.filterOptionValues.quotesParameter.length; i++){
								switch(options.filterOptionValues.quotesParameter[i]){
									case 'viewOnly': rows = rows.filter(filterViewOnly); break;
									case 'checkedOut': rows = rows.filter(filterCheckedOut); break;
									case 'expiredQuotes': rows = rows.filter(filterExpiredQuotes); break;
									case 'expiredCatalogs': rows = rows.filter(filterExpiredCatalogs); break;
								}
							}
						}

						resolve(rows);
					}
					else{
						resolve(rows);
					}
				});

			}


			debugger;
			if(this.isOnline()){
					
				// If online - refresh all quotes
				this.refreshAllQuotes().then(results => {

					debugger;
					queryLocal();

				});
			}
			else{
				queryLocal();
			}


		});
	}


	getQuoteSummary(id) {

		return new Promise(resolve => {

			this.dbAdaptor.loadItemFromLocal('quote-retrieve', id).then(result => {

				resolve(result);

			});
		
		});

	}

	getSummaryLayout(objectType, id) {

		return new Promise<any[]>(resolve => {

			this.dbAdaptor.loadItemFromLocal(objectType+'-summarylayout', id).then(result => {

				let column;
				let res = [];
				let rows = result.pageLayout.pageLayoutSections[0].rows;

				for(var i=0; i<rows.length; i++){

					column = rows[i].columns[0];
					res.push(column);

				}

				resolve(res);

			});

		});

	}

	getObjectDescribe(objectType) {

		return new Promise<any[]>(resolve => {

			this.dbAdaptor.loadItemFromLocal(objectType+'-describe', '').then(result => {

				let column;
				let res = [];
				let fields = result.objects[0].fields;

				resolve(fields);

			});

		});

	}

	getQuoteProducts(quoteId){

		return new Promise(resolve => {

			let objectType = 'quoteline';
			let params = {
				keywordIndex: 'keyword-quoteline',
				keywordQuery: quoteId
			}
			this.dbAdaptor.queryItems(objectType, params).then(results => {

				let rows: any[] = results;
				resolve(rows);

			});

		});

	}



	getCatalogs() {

		return new Promise(resolve => {

			let objectType = 'catalog';
			let params = {
			}

			this.dbAdaptor.queryItems(objectType, params).then(results => {

				let rows: any[] = results;
				resolve(rows);

			});

		});

	}

	getCatalog(catalogId){

		return new Promise(resolve => {

			this.dbAdaptor.loadItemFromLocal('catalog', catalogId).then(res => {

				return resolve(res);

			});

		});
	}

	getCatalogProductGroups(catalogId, parentGroupId) {

		return new Promise(resolve => {

			this.dbAdaptor.loadItemFromLocal('catalog-productgroup', catalogId+'-'+parentGroupId).then(res => {

				let productGroup: any = res;

				let ps = [];
				if(productGroup.product_groups){
					for(var i=0; i<productGroup.product_groups.length; i++){
						ps.push(this.dbAdaptor.loadItemFromLocal('catalog-productgroup', catalogId+'-'+productGroup.product_groups[i]))
					}
				}

				Promise.all(ps).then(res => {

					return resolve(res);

				});

			});

		});

	}

	getCatalogItem(catalogId, itemId){

		return this.dbAdaptor.loadItemFromLocal('catalog-item', catalogId+'-'+itemId);

	}

	getCatalogProducts(catalogId, parentGroupId) {

		return new Promise(resolve => {

			this.dbAdaptor.loadItemFromLocal('catalog-productgroup', catalogId+'-'+parentGroupId).then(res => {

				let productGroup: any = res;

				let ps = [];
				if(productGroup.products){
					for(var i=0; i<productGroup.products.length; i++){
						ps.push(this.dbAdaptor.loadItemFromLocal('catalog-item', catalogId+'-'+productGroup.products[i]));
					}
				}

				Promise.all(ps).then(res => {

					return resolve(res);

				});

			});

		});

	}

	getCatalogProductOptionGroups(catalogId, parentGroupId) {

		return new Promise(resolve => {

			this.dbAdaptor.loadItemFromLocal('catalog-optiongroup', catalogId+'-'+parentGroupId).then(res => {

				let optionGroup: any = res;

				let ps = [];
				if(optionGroup.option_groups){
					for(var i=0; i<optionGroup.option_groups.length; i++){
						ps.push(this.dbAdaptor.loadItemFromLocal('catalog-optiongroup', catalogId+'-'+optionGroup.option_groups[i]))
					}
				}

				Promise.all(ps).then(res => {

					return resolve(res);

				});

			});

		});

	}

	getCatalogProductOptionsFlattened(catalogId, parentGroupId) {

		return new Promise(resolve => {

			let flattenOptionGroup = function(catalog, groupId){

				let result = [];
				let option: any = {};
				let options = [];
				let option_group = catalog.option_groups[groupId];
				if(option_group && option_group.options && option_group.options.length>0){

					for(var i=0; i<option_group.options.length; i++){

						let optionId = option_group.options[i];
						option = catalog.items[optionId];
						if(option){
							option.user_input = null;
							options.push(option);
						}
					}

					//
					option_group.expandedInfo = {
						"id": option_group.id,
						"name": option_group.name,
						"type": option_group.view.type,
						"selection_type": option_group.view.selection_type,
						"options": options
					};
					/*
						"id": "Opt_CaseA",
						"name": "Hardware",
						"type": "table",
						"selection_type": "text",
						"options": [
							{
								"id": "Opt_CaseA_1",
								"order_code": "Opt_CaseA_1",
								"type": "quantity",
								"name": "Hardware Option 1",
								"price": 450,
								"min": 0,
								"max": 1000,
								"user_input": null
							},
							{
								"id": "Opt_CaseA_2",
								"order_code": "Opt_CaseA_2",
								"type": "quantity",
								"name": "Hardware Option 2",
								"price": 700,
								"min": 0,
								"max": 1000,
								"user_input": null
							},
							{
								"id": "Opt_CaseA_3",
								"order_code": "Opt_CaseA_3",
								"name": "Hardware Option 3",
								"type": "quantity",
								"price": 700,
								"min": 0,
								"max": 1000,
								"user_input": null
							}
						]
					};
					*/

					result.push(option_group);

				}
				else if (option_group && option_group.option_groups && option_group.option_groups.length>0){

					let sub_result = [];
					for(var i=0; i<option_group.option_groups.length; i++){
						sub_result = flattenOptionGroup(catalog, option_group.option_groups[i]);
						result = result.concat(sub_result);
					}

				}
				else{
					console.error('Error - invalid option group '+groupId+' in catalog '+catalogId);
				}

				return result;

			}

			this.dbAdaptor.loadItemFromLocal('catalog', catalogId).then(res => {

				let catalog: any = res;
				let options = flattenOptionGroup(catalog, parentGroupId);
				resolve(options);

			});

		});

	}

	getCatalogProductOptions(catalogId, parentGroupId){




	}

	getImage(imageId){

		return this.restApi.getImage(imageId);

	}

	// For briefcase screen
	getBriefcaseInfo() {

		let res: any = [];
		return new Promise(resolve => {

			let ps = [];
			let params: any = {};
			let objectType = 'opportunity';

			this.dbAdaptor.queryItems(objectType, params).then(opps => {

				let opportunities: any[] = opps;
				let opportunity;

				for(var i=0; i<opportunities.length; i++){

					opportunity = opportunities[i];
					ps.push(this._getBriefcaseOpportunityInfo(opportunity));

				}

				Promise.all(ps).then(res => {
					resolve(res);
				});

			});


		});
	}

	_getBriefcaseOpportunityInfo(opportunity){

		opportunity.quotes = [];
		opportunity.selected = false;

		let res: any = [];
		return new Promise(resolve => {

			let objectType = 'quote';
			let params: any = {
				keywordIndex: 'keyword-quote',
				keywordQuery: opportunity.Id
			};

			this.dbAdaptor.queryItems(objectType, params).then(res => {

				let quotes: any = res;
				opportunity.quotes = quotes;
				resolve(opportunity);

			});

		});

	}

		/*
		return new Promise(resolve => {

			 let res = [{
				accountName: 'Account 1',
				opportunityName: 'Opp 1',
				lastRefreshDate: 'X-XX-XXXX',
				lastRefreshTime: 'X:XX-PM',
				selected: false,
				quotes: [
					{
						quoteName: 'quote 1',
						lastModifiedDate: 'X-XX-XXXX',
						lastModifiedTime: 'X:XX PM',
						readOnly: true

					},
					{
						quoteName: 'quote 2',
						lastModifiedDate: 'X-XX-XXXX',
						lastModifiedTime: 'X:XX PM',
						readOnly: false

					},
					{
						quoteName: 'quote 3',
						lastModifiedDate: 'X-XX-XXXX',
						lastModifiedTime: 'X:XX PM',
						readOnly: true
					}

				]
			}, {
				accountName: 'Account 2',
				opportunityName: 'Opp 2',
				lastRefreshData: 'X-XX-XXXX',
				lastRefreshTime: 'X:XX-PM',
				selected: false,
				quotes: [
					{
						quoteName: 'quote 1',
						lastModifiedDate: 'X-XX-XXXX',
						lastModifiedTime: 'X:XX PM',
						readOnly: true

					},
					{
						quoteName: 'quote 2',
						lastModifiedDate: 'X-XX-XXXX',
						lastModifiedTime: 'X:XX PM',
						readOnly: false

					},
					{
						quoteName: 'quote 3',
						lastModifiedDate: 'X-XX-XXXX',
						lastModifiedTime: 'X:XX PM',
						readOnly: true
					}

				]
			}, {
				accountName: 'Account 3',
				opportunityName: 'Opp 3',
				lastRefreshData: 'X-XX-XXXX',
				lastRefreshTime: 'X:XX-PM',
				selected: false,
				quotes: [
					{
						quoteName: 'quote 1',
						lastModifiedDate: 'X-XX-XXXX',
						lastModifiedTime: 'X:XX PM',
						readOnly: true

					},
					{
						quoteName: 'quote 2',
						lastModifiedDate: 'X-XX-XXXX',
						lastModifiedTime: 'X:XX PM',
						readOnly: false

					},
					{
						quoteName: 'quote 3',
						lastModifiedDate: 'X-XX-XXXX',
						lastModifiedTime: 'X:XX PM',
						readOnly: true
					}

				]
			}]

			resolve(res);

		});

		*/

	getQuoteFilterOptions() {

		return new Promise(resolve => {

			let result = {

				// radio select options:
				//   expiredCatalogs
				//   expiredQuotes
				//   checkedOut
				//   viewOnly
				'quotes': [
					'expiredCatalogs',
					'expiredQuotes',
					'checkedOut',
					'viewOnly'
				],

				// radio select options:
				//   today
				//   last7Days
				//   last30Days
				'dateModified': [
					'today',
					'last7Days',
					'last30Days'
				],

				'currency': "USD",
				'owner': null,
				'status': null

			}

			resolve(result);

		});

	}

	getOpportunityQueryFilters(){

		return new Promise(resolve => {
			
			let result = {

				// radio select options:
				//   expiredCatalogs
				//   expiredQuotes
				//   checkedOut
				//   viewOnly
				'quotes': [
					'expiredCatalogs', 
					'expiredQuotes',
					'checkedOut',
					'viewOnly'
				 ],

				// radio select options:
				//   today
				//   last7Days
				//   last30Days
				'dateModified': [
					'today',
					'last7Days',
					'last30Days'
				],

				'currency': "USD",
				'owner': null,
				'status': null

			}

			resolve(result);
		
		});

	}








	// test method
	getUsers() {

		// don't have the data yet
		return new Promise(resolve => {
			// We're using Angular HTTP provider to request the data,
			// then on the response, it'll map the JSON data to a parsed JS object.
			// Next, we process the data and resolve the promise with the new data.
			this.http.get('https://randomuser.me/api/?results=10')
				.map(res => res.json())
				.subscribe(data => {
					// we've got back the raw data, now generate the core schedule data
					// and save the data for later reference
					resolve(data.results);
				});
		});
	}

	getAlerts(){

		let objectType = 'quote';
		let params = {
			limit: 2,
			offset: 0,
			keywordIndex: 'keyword-quote',
			keywordQuery: 'sAliEnt'
		};

		let res: any = {
			expiredCatalogOnQuote: [],
			expiredQuotes: []
		};

		return new Promise(resolve => {

			this.dbAdaptor.queryItems(objectType, params).then(results => {

				let rows: any[] = results;

				if(rows.length>0){
					for(var i=0; i<rows.length; i++){
						res.expiredQuotes.push(rows[i]);
					}
				}

				resolve(res);

			});

		});

	}
/*
	stub_getAlerts(){

		return new Promise(resolve => {
			
			let result = {
				'expiredCatalogOnQuote': [
				],
				'expiredQuotes': [
					{
						'accountName': "Account A1",
						'opportunityName': "Opportunity O1",
						'quoteName': "Quote Q1"
					},
					{
						'accountName': "Account A2",
						'opportunityName': "Opportunity O2",
						'quoteName': "Quote Q2"
					}
				]
			};

			resolve(result);

		});
	}
 */

	stub_getNotifications(){

		return new Promise(resolve => {
			
			let result = [
				{
					'title': "CPQ Mobile 1.1 Release",
					'body': "Announcing CPQ Mobile 1.1 releasing on June XX, XXXX.\nNew features include:\n\tEnhancement 1\nEnhancement 2\nEnhancement 3"
				},
				{
					'title': "Upcoming Scheduled Downtime",
					'body': "CPQ will be down for maintenance on May XX, XXXX, for approximately 2 hours."
				}
			];

			resolve(result);

		});

	}

	getMyRecentActivity(){

		let objectType = 'quote';
		let params = {
			limit: 4

		};

		let res: any = {
			recentQuotes: []
		};

		return new Promise(resolve => {

			this.dbAdaptor.queryItems(objectType, params).then(results => {

				let rows: any[] = results;

				if(rows.length>0){
					for(var i=0; i<rows.length; i++){
						res.recentQuotes.push(rows[i]);
					}
				}

				resolve(res);

			});

		});

	}

	stub_getMyRecentActivity(){

		return new Promise(resolve => {
			
			let result = {

				'recentQuotes': [
					{
						'accountName': "Account A1",
						'opportunityName': "Opportunity O1",
						'quoteName': "Quote Q1",
						'lastModified': {
							'date': '5.04.2017',
							'time': '2:45 PM'
						}
					},
					{
						'accountName': "Account A2",
						'opportunityName': "Opportunity O2",
						'quoteName': "Quote Q2",
						'lastModified': {
							'date': '5.02.2017',
							'time': '1:45 PM'
						}
					},
					{
						'accountName': "Account A3",
						'opportunityName': "Opportunity O3",
						'quoteName': "Quote Q3",
						'lastModified': {
							'date': '5.01.2017',
							'time': '12:45 PM'
						}
					}
				]
			
			};

			resolve(result);

		});

	}

	doMyCPQDriveRefresh(){

		var now = new Date();

		this.cpqDrive_lastRefresh = {
			'date': now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate(),
			'time': now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds()
		}

	}

	getMyCPQDriveSummary(){

		let bytesUsed = this.dbAdaptor.getBytesInStorage();
		let checkedOutQuotes = this.cpqDrive_checkedOutQuotes;
		let lastRefresh = this.cpqDrive_lastRefresh;

		return new Promise(resolve => {
			
			if(!lastRefresh){
				this.doMyCPQDriveRefresh();
				lastRefresh = this.cpqDrive_lastRefresh;
			}

			let res = {
				'storage': {
					'mbUsed': Math.round(bytesUsed/1024/1024 * 100) / 100,
					'mbAvailable': 50
				},
				'lastRefresh': lastRefresh,
				'checkedOutQuotes': checkedOutQuotes
			};

			resolve(res);

		});

	}

	initSettings(){

		return new Promise(resolve => {

			this.storage.get('settings').then(res => {
				let settings: any = res;
				if(!settings){
					settings = {
						onlineMode: false,
						autoRefresh: false
					}
				}
				this.settings = settings;
				resolve(true);
			}).catch( err => {
				console.warn('Error caught in LDS.initSettings');
			});

		});

	}

	getSettings(){

		return new Promise(resolve => {
			
			let res = this.settings;
			if(!res){
				res = {
					onlineMode: false,
					autoRefresh: false
				}
			}
			return resolve(res);

		});

	}

	setSettings(settings){

		return new Promise(resolve => {
		 
			for(let key in settings){
				this.settings[key] = settings[key];
			}

			this.saveSettings().then(res => {
				resolve(true);
			})

		});
	}

	saveSettings(){

		return new Promise(resolve => {
		 
			this.storage.set('settings', this.settings).then(res => {
				resolve(true);
			});

		});

	}

	setOnlineStatus(params){

		//this.onlineMode = params.onlineMode;
		//if(params.autoRefresh) this.autoRefresh = params.autoRefresh;

		this.setSettings(params);

	}



	loginUser(params){

		return new Promise(resolve => {
		
			this.restApi.login(params).then(res => {

				let data: any = res;
				if(data.success){
					// store 
					this.storage.set('userCache', params).then(res => {
						resolve(data);
					});
				}
				else{
					resolve(data);
				}

			});
		});

	}

	logoutUser(){

		return new Promise(resolve => {
			this.storage.remove('userCache').then(res => {
				resolve(res);
			});
		});

	}

	attemptAutoLogin(){

		return new Promise(resolve => {

			this.storage.get('userCache').then(res => {
				let user: any = res;

				if(!user){
					// No User ONLINE or OFFLINE
					resolve({
						success: false,
						message: "Auto login not available"
					});
				}
				else if(user && this.isOnline()){
					// Has User ONLINE - re-submit login
					this.loginUser(user).then(data => {
						resolve({
							success: true,
							message: "Successfully Logged in"
						});
					})
				}
				else if(user){
					// Has User OFFLINE
					// todo - check if Offline session timeout exceeded
					resolve({
							success: true,
							message: "Successfully Logged in Offline"
						});
					
				}

			});

		});

	}

	//
	// STUBS
	//


	stub_getQuoteProducts(){

		var res;
		return new Promise(resolve => {

			res = [
				{
					id: "359_HD",
					qty: 2,
					name: "359 Heavy Duty",
					desc: "DESC 1",
					orderNum: "359_HD",
					price: 112,
					currency: 'USD'
				},
				{
					id: "379_HD",
					qty: 1,
					name: "379 Heavy Duty",
					desc: "DESC 2",
					orderNum: "379_HD",
					price: 854,
					currency: 'USD'
				},
				{
					id: "389_HD",
					qty: 1,
					name: "389 Heavy Duty",
					desc: "DESC 3",
					orderNum: "389_HD",
					price: 768,
					currency: 'USD'
				},
				{
					id: "258LP",
					qty: 2,
					name: "Medium Duty",
					desc: "DESC 4",
					orderNum: "258LP",
					price: 295,
					currency: 'USD'
				},
				{
					id: "268_Conventional",
					qty: 4,
					name: "268 Conv",
					desc: "DESC 5",
					orderNum: "268_Conv",
					price: 638,
					currency: 'USD'
				},
			];

			resolve(res);
		
		});

	}

	stub_getCatalogs() {

		var res;
		return new Promise(resolve => {

			res = [
				{
					name: "Torque Trucks (Full)",
					id: "xxa0000000000004"
				},
				{
					name: "Torque 359_HD (English)",
					id: "xxa0000000000001"
				},
				{
					name: "Torque 579_HD (English)",
					id: "xxa0000000000002"
				}
			];

			resolve(res);

		});

	}

	stub_getCatalogProductGroups(catalogId, parentGroupId) {

		var res;
		return new Promise(resolve => {

			if (parentGroupId) {
				res = [
					{
						id: "PG_Semis_MediumDuty",
						description: "Medium Duty",
						image: "image_0001",
						products: ["359_HD"]
					},
					{
						id: "PG_Semis_HeavyDuty",
						description: "Heavy Duty",
						image: "image_0001",
						products: ["359_HD"]
					}
				];

			}
			else {

				res = [
					{
						id: "PG_Semis",
						description: "Semis",
						image: "image_0003",
						product_groups: ["PG_Semis_MediumDuty","PG_Semis_HeavyDuty"]
					},
					{
						id: "PG_VocationalApplications",
						description: "Vocational Applications",
						image: "image_0002",
						products: ["359_HD"]
					},
					{
						id: "PG_Distribution",
						description: "Distribution",
						image: "image_0002",
						products: ["359_HD"]
					}
				];

			}

			resolve(res);

		});

	}

	stub_getCatalogProducts(catalogId, parentGroupId) {

		var res;
		return new Promise(resolve => {

			if (parentGroupId == 'PG_Semis') {
				res = [
					{
						"id": "359_HD",
						"order_code": "359_HD",
						"type": "product",
						"name": "359 Heavy Duty",
						"description": "The .ability.",
						"more_info": "",
						"image": "image_0004",
						"price": 84393,
						"base_price": 73257,
						"root_category": "Mg",
						"default_selections": [
							{ "id": "WB-238-13J" }, { "id": "HB5RSU" }, { "id": "ENGINE" },
							{ "id": "EXHBRAKE" }, { "id": "FUELFILT" }, { "id": "ALT.ITECAB" }
						],
						"requires": [],
						"excludes": []
					},
					{
						"id": "360_HD",
						"order_code": "360_HD",
						"type": "product",
						"name": "360 Heavy Duty",
						"description": "The .ability.",
						"more_info": "",
						"image": "image_0005",
						"price": 84393,
						"base_price": 73257,
						"root_category": "Mg",
						"default_selections": [
							{ "id": "WB-238-13J" }, { "id": "HB5RSU" }, { "id": "ENGINE" },
							{ "id": "EXHBRAKE" }, { "id": "FUELFILT" }, { "id": "ALT.ITECAB" }
						],
						"requires": [],
						"excludes": []
					},
				];
			}
			else {
				res = [
					{
						"id": "361_HD",
						"order_code": "361_HD",
						"type": "product",
						"name": "361 Heavy Duty",
						"description": "The .ability.",
						"more_info": "",
						"image": "image_0004",
						"price": 84393,
						"base_price": 73257,
						"root_category": "Mg",
						"default_selections": [
							{ "id": "WB-238-13J" }, { "id": "HB5RSU" }, { "id": "ENGINE" },
							{ "id": "EXHBRAKE" }, { "id": "FUELFILT" }, { "id": "ALT.ITECAB" }
						],
						"requires": [],
						"excludes": []
					}
				]
			}

			resolve(res);

		});

	}

	stub_getProductImage(imageId) {

		var res, dat;

		imageId = 'image_001';

		switch (imageId) {
			case 'image_001': dat = "data:image/png;base64,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"; break;      case 'image_0002': dat = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBg4IBwgKCgkQFR4YGAwMDRYeHhYgIBYXIiAdHx8kKDQsJCYxJx8fLTEtMSktOi4uIys/ODM4Pio5LisBCgoKDQ0NGg0NGisZFR0rKysrKy0rKysrKysrKysrKy0rKysrLSsrKysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAEAAQAMBIgACEQEDEQH/xAAcAAABBQEBAQAAAAAAAAAAAAADAgQFBgcBAAj/xAA7EAABAwIEAwMIBwkAAAAAAAABAgMEABEFEiFhBjFRE0HRBxRCcYGxweEiMmKCkaHwFRYjM1JjcpPS/8QAFwEBAQEBAAAAAAAAAAAAAAAAAgEAA//EAB0RAAMAAgMBAQAAAAAAAAAAAAABEQIhEjFBUWH/2gAMAwEAAhEDEQA/ANlApQpIpQ0rhTpBVerlxXr1qaHaG42VJsFEeqlXrxNR7MtEbIw1t4kuOOX2vUS7AdacytLUsbirE62HUlJUoA9DTVUEKNisgbD40droSj7HiVnoPYa6FjlmH4iqYibICbWUB/ifCnMYPyDZI9pqydsi34WklVrJUL70IplX0cQBuKjmcOdIut4J2BNHGHMgfxnb+ujRQclT4H81kHqQfGkecOJNnHmifsj50HsMNaF1ZDuRSTMwpoaraH3flW2+iaXYUvuuGzbyU7KT4UF+JNcF1TgB07IeNDXjeGpFkOJOwSrwpu5xBFR9RvNsPmKqT+GbX0WiVAKUuNywtB5FI0O+grq8VipGVCVKPXl7q+e25z7acrMqQ2OiHCPyo8TivG8MVdiY46j+8Av33tWxxTNyaN3XJ7QXbdfQeiCfCmxRLd1bU6o/aUke+s2wfyi4vMkojfs9uU4r0WEkHc940F+dhuKuiXceeLocwR+OEJulbshnKs6aXCjY639QNNYPwLyQ8dbng5VJcOwAPuoBbmE6MvH7h8KgMRwTiWcwCIJeKtc3nDVteVhm0H66moc8N8RxSC/hzaQfRckM67D6d66pTwD36XJ1iZbMqO8B1LR8KaFKidSR6xULA4c4i86QWsObiqBvnEhGuxIJIqwuw5b+POOYbh8swH15bvyGUpbWlSgtSQVFZSQL2Cb8yB3Ur+B4mHKS+nVJBG5NFbS4RZbZN+h+NOQuMORdVsQB8TSg6xbRhz/aP+a5cR0PhCnIiZCoroakKbASpSwn00ki5IsTYDmKtsTygv4bhCIfETbi3PRS2QVkDS5FwAL8tb6HuqgYghUpjs2UBBve6l/lyFNBElFoNupZcy8iVK025ctq6YuKBarNLj+VPDI6Oyaiz0s/0gJ7ySTcrv3+yh/vSzJirmcNxC7LT9cy3FKcAPeASQbd2pA6Vmhw+Te4bYA3Uql+bTEtFtvsG0nnkUdfWedtqSyI0XjBcfxpMt7EsTmPKCEH6BdHM2tdANgNDrlHOm/DnEjODxXJGIRJE6VdRS0XciQDZRJVckXJJICRc6k1TY8WdHKi2tpOZJSRrqCLEH9c7UR1ElaMinEpRa1rk93s/Ci3SpQ//9k='; break;
			case 'image_002': dat = 'data:image/png;base64,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'; break;
			case 'image_003': dat = 'data:image/png;base64,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'; break;
			case 'image_004': dat = 'data:image/png;base64,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'; break;
			case 'image_005': dat = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABHCAYAAACH4FBHAAAKvGlDQ1BJQ0MgUHJvZmlsZQAASImVlwdUU1kax+976SGhBSKd0DvSq/QaQHoXlZBACCWEFFTsyuAIjgUREVQGdKQpOCp1UBELtkFAwe6ADALKOFgQFZV5wBJ2ds/unv3Ouef+8uW+//u+m3vP+QcA0iiDx0uDpQFI5wr5oT7utOiYWBpuEMBAGZCBIrBmMAU8t+DgAIDEwvz3+NAPoNn5rsms1r9//19DhpUoYAIABSOcwBIw0xE+h4wuJo8vBACVg+S11gh5s1yFsBwfKRDhtllmz3P3LCfM8+9za8JDPRD+CACexGDw2QCQ0EielsVkIzokbYTNuCwOF+FwhJ2ZyQwWwoUIG6enZ8xyO8L6Cf+kw/6bZoJYk8Fgi3m+l7nAe3IEvDTGuv9zO/53pKeJFt6hiQxSMt83FJl1kT2rSs3wFzM3ITBogTmsufVznCzyjVhgpsAjdoFZDE//BRalRrgtMIO/+CxHSA9fYH5GqFifmxYYINZPpIs5UeAVtsBJHG/6Amcnh0ctcBYnMnCBBalh/otrPMR5vihUXHMS31vcY7pgsTYmY/FdwuRw38UaosX1sBI9vcR5boR4PU/oLtbkpQUv1p/mI84LssLEzwqRA7bAKQy/4EWdYPH+gHCQDESAC1ggEfBBAsgAaUAIaMATcIAA8JBPDIAcD2HiWuFsEx4ZvHV8DjtZSHNDblEijc5lmhrTLMzMbQGYvZPzP/k76txdg6g3F3OZ7QDY5yFJ9mKOoQVAywsAKB8Wc1pvkeOyF4Dz3UwRP2s+N3tsAQYQgRSQQ267GtAC+sAEWAAb4AhcgRfwA0FIJzFgFWAi/aQjnawBG8BWkAvywV5wAJSAMnAMVIFT4AxoAm3gErgGboFu0AcegwEwDF6BCfABTEMQhIPIEAVShNQhHcgIsoDsIGfICwqAQqEYKB5iQ1xIBG2AtkP5UAFUApVD1dDPUAt0CboB9UAPoUFoDHoLfYZRMAmWg1VhXXgpbAe7wf5wOLwSZsOZcDacA++Gi+EK+CTcCF+Cb8F98AD8Cp5EAZQEiorSQJmg7FAeqCBULCoJxUdtQuWhilAVqDpUK6oTdRc1gBpHfUJj0RQ0DW2CdkT7oiPQTHQmehN6F7oEXYVuRF9B30UPoifQ3zBkjArGCOOAoWOiMWzMGkwupghzAtOAuYrpwwxjPmCxWCpWD2uL9cXGYFOw67G7sEew9dh2bA92CDuJw+EUcUY4J1wQjoET4nJxh3AncRdxvbhh3Ee8BF4db4H3xsfiufht+CJ8Df4Cvhc/gp8mSBN0CA6EIAKLsI6wh3Cc0Eq4QxgmTBNliHpEJ2I4MYW4lVhMrCNeJT4hvpOQkNCUsJcIkeBIbJEoljgtcV1iUOITSZZkSPIgxZFEpN2kSlI76SHpHZlM1iW7kmPJQvJucjX5MvkZ+aMkRdJUki7JktwsWSrZKNkr+VqKIKUj5Sa1SipbqkjqrNQdqXFpgrSutIc0Q3qTdKl0i/R96UkZioy5TJBMuswumRqZGzKjsjhZXVkvWZZsjuwx2cuyQxQURYviQWFStlOOU65ShuWwcnpydLkUuXy5U3JdchPysvJW8pHya+VL5c/LD1BRVF0qnZpG3UM9Q+2nfl6iusRtSeKSnUvqlvQumVJQVnBVSFTIU6hX6FP4rEhT9FJMVdyn2KT4VAmtZKgUorRG6ajSVaVxZTllR2Wmcp7yGeVHKrCKoUqoynqVYyq3VSZV1VR9VHmqh1Qvq46rUdVc1VLUCtUuqI2pU9Sd1TnqheoX1V/S5GlutDRaMe0KbUJDRcNXQ6RRrtGlMa2ppxmhuU2zXvOpFlHLTitJq1CrQ2tCW117ufYG7VrtRzoEHTudZJ2DOp06U7p6ulG6O3SbdEf1FPToetl6tXpP9Mn6LvqZ+hX69wywBnYGqQZHDLoNYUNrw2TDUsM7RrCRjRHH6IhRjzHG2N6Ya1xhfN+EZOJmkmVSazJoSjUNMN1m2mT6eqn20til+5Z2Lv1mZm2WZnbc7LG5rLmf+TbzVvO3FoYWTItSi3uWZEtvy82WzZZvrIysEq2OWj2wplgvt95h3WH91cbWhm9TZzNmq20bb3vY9r6dnF2w3S676/YYe3f7zfZt9p8cbByEDmcc/nQ0cUx1rHEcXaa3LHHZ8WVDTppODKdypwFnmnO884/OAy4aLgyXCpfnrlquLNcTriNuBm4pbifdXrubufPdG9ynPBw8Nnq0e6I8fTzzPLu8ZL0ivEq8nnlrerO9a70nfKx91vu0+2J8/X33+d6nq9KZ9Gr6hJ+t30a/K/4k/zD/Ev/nAYYB/IDW5fByv+X7lz8J1AnkBjYFgSB60P6gp8F6wZnBv4RgQ4JDSkNehJqHbgjtDKOErQ6rCfsQ7h6+J/xxhH6EKKIjUioyLrI6cirKM6ogaiB6afTG6FsxSjGcmOZYXGxk7InYyRVeKw6sGI6zjsuN61+pt3LtyhurlFalrTq/Wmo1Y/XZeEx8VHxN/BdGEKOCMZlATzicMMH0YB5kvmK5sgpZY4lOiQWJI0lOSQVJo2wn9n72WLJLclHyOMeDU8J5k+KbUpYylRqUWpk6kxaVVp+OT49Pb+HKclO5VzLUMtZm9PCMeLm8gUyHzAOZE3x//gkBJFgpaBbKIebntkhf9J1oMMs5qzTr45rINWfXyqzlrr29znDdznUj2d7ZP61Hr2eu79igsWHrhsGNbhvLN0GbEjZ1bNbanLN5eIvPlqqtxK2pW3/dZratYNv77VHbW3NUc7bkDH3n811trmQuP/f+DscdZd+jv+d837XTcuehnd/yWHk3883yi/K/7GLuuvmD+Q/FP8zsTtrdtcdmz9G92L3cvf37XPZVFcgUZBcM7V++v7GQVphX+P7A6gM3iqyKyg4SD4oODhQHFDcf0j6099CXkuSSvlL30vrDKod3Hp46wjrSe9T1aF2Zall+2ecfOT8+KPcpb6zQrSg6hj2WdezF8cjjnT/Z/VR9QulE/omvldzKgarQqivVttXVNSo1e2rhWlHt2Mm4k92nPE8115nUlddT6/NPg9Oi0y9/jv+5/4z/mY6zdmfrzumcO9xAachrhBrXNU40JTcNNMc097T4tXS0OrY2/GL6S2WbRlvpefnzey4QL+RcmLmYfXGyndc+fol9aahjdcfjy9GX710JudJ11f/q9Wve1y53unVevO50ve2Gw42Wm3Y3m27Z3Gq8bX274VfrXxu6bLoa79jeae62727tWdZzodel99Jdz7vX7tHv3eoL7Ovpj+h/cD/u/sAD1oPRh2kP3zzKejT9eMsTzJO8p9JPi56pPKv4zeC3+gGbgfODnoO3n4c9fzzEHHr1u+D3L8M5L8gvikbUR6pHLUbbxrzHul+ueDn8ivdqejz3D5k/Dr/Wf33uT9c/b09ETwy/4b+ZebvrneK7yvdW7zsmgyeffUj/MD2V91HxY9Unu0+dn6M+j0yv+YL7UvzV4GvrN/9vT2bSZ2Z4DD5jzgqgkAEnJQHwthIAcgziHRBfTZSc98xzAc37/DkC/4nnffVc2ABQ6QpAxBYAAhCPchQZOlvmvfWsZQp3BbClpXj8IwRJlhbzWiTEeWI+zsy8UwUA1wrAV/7MzPSRmZmvx5FiHwLQnjnv1WcDi/yDKdBT1CbSe8nO4F/jL1tPCuFWN/QtAAABm2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj45MDwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj43MTwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgoBdV3yAAAUKElEQVR4Ae2c609bR7eHl/Hd3CGQhBDipGnaqDe1Od8qtVI/9h8+r3TeHFX9ULWq+ranaRvlfiGEBMLdYGxjc37PGg/mYhJIIaoRk2xv79vsmWfWrLVmzZjEppKdpmMn0HXsbzh9gRM4Bf2OBOEU9Cnod0TgHb0m9Xffgy2N9vSwVjWx7eWJRMLYTmr6W6CrtQ2rVNattLpmjUbdGk3S23Hthr/9Gt+7kklLp9NWKOQtq31XV9eJBP7WoHEKS6ur9uLlrD16+sTW16uCHbB2STK7Ul222WgIvraGiDYJ64pA6lBbMtFluVzWent6bfzCeRsZHrRsNqs7uN584ISI+KFBRzXREL3V9YpNCfR/fr1li8slq1Y2HMvgQJ+NjAzb2mrJSsvLtrS8aI1EUvTSAii42Yx1S4IHBvusp1CwTHbe8t156+vrsXQqZYkkxQqNdlKAvwVos1qtamtra1ZaK9vc4pLdu//IZmbnba1cU9dP2MT4BUul0jY/N2uzL6ft5fQzq25mrJ7I6HrShmiIM0OS9k2rVmtqgIZdvHjBypWqJXQun8u5OtkOOTYwLbn9vLdsB3wcCjSVRSe/fPnSnjx5YslCn9U36rYhXQ2wmvZZSavMo9Wlszc2NnS94VqD42pjw5JdklTBLkiCE9LHnE9wf71uKysr9nJ5yc4MD9vo6Kg3VjK5U4V0ImTk4FCgkeJffvnFHj9+bK/m5qx47boASzfX0cNsdYHFQFakv0su9euVsh/XLW0NtK9L8bqgliS1en0jb5lMSveWbWrquf3x2692/txZ+/DDD61YLFpPT49LcKcCjp3tQKBjt0Xibt68aXfv3rWUPIRc34D26uYyfLmsQMoYIn+1asVWpJvL62WrSs0grV2pjOXSSYdWq63b0tKCS3dXYtMy6T7X5TPTU/bvf/+PDOMFb8BhSTagT0I6EOhYUYBvSFUgffW6DJ3AD53J2/jFMesb7LeKpJuUyQiqVEgum7L+/l6rjZ2XcpA0S2XgTKCnkeas7sMYDg4N2qtXr2zyyWObejZloyMjcvcKfl98d6fvDwwafbu+vm7LktRSaVX6MyWVILAC1yuYaUl0TfeIKP+VMGpy1WQck/IiNuob2upbvLhHwmxpqY2cjN/LhTmHXSqVbH5+3l68eKH3lX0w1Olqg0ofONYBZAAgeavyn9NpPIguVxfoZ4gnJalJNUAylZTwdrnU5vM56+/tcZg0TlIDFAYp7GmAaBDxt5Wd3/f8+XP76aef/F008ElIBwYN4KdPn/oIbnBgILhY0skMSuoyhngPdcHC40DF6L97EzgNKaQalSFiSHK4vinjqOf0jD+Hfpevnc3l/dlyuayeUzL2JyEdGDQu3cOHD30k19ffp7rjlAkWoIHsXofQAZl/DltYdV5jRKkJpF7HzfPBS4neCs+pITSYYWTY29vrRhDji6oir05PbwQdgc3Oztr9+/elNtCbwiwJhRsHfI1buL91fVMEcfmQfPmBDo3nt9A189ANnicjw/HxcXv//fdddUxNTbnXEtRT5+I+AGhGgjWvLB4H+pnuvCkwKIqmsnACzkxAgQrgDYGt6tk16Xf2dZ3zhmhhpqWa/7VXa6G7M83gEv76s2fPfODT6VL9Rq+DQUi5vOYu2+DggD1/Pu0DEdwvYHuvdlZAbB1D3qVZol+VxxFUi4Tam4SQKApF/xy+7qWVRDopi0jDLi0tuefBCJERJ4a0k9MbJZrR4P37DwQmYVevXpXEdflgAglzfexdnpic/gkWGcYNdQLBRt1bwlUDAxTfhBzUiDMeR5RYvJDllWWHjD+OzqYMne59vFZMqDzG6NatW9bd3W1nzpzxrs1Ij2tswDh7dtRymawPUgDn/IAcSPNtK4HWT2svvrahPKqKh+AS0hIJeSjLSysO9uOPP3bDOD8/50YY6J3qU+8LOoIE9G+//WZXrlyxS8Wig2YQ4t1ekFAho2qAyxPjdn50ZAvom764LEuXTyvM+vvtO/ZqRiFUb4Qud+sqGsafO3fOQT97NqkQap9/P3GgAYWlJ1ZBpaekmyuK0DEa9IGGrouzSxieQk7SVsgXeKwlsuGo/ace5h/RPp9Vad4FSEaYGM+y4t347ytSJePjFx18+8z++Wf3lWiKTmXXyxVVvC4j+NxmZl55JA7PwGmiJZqwgRWmoQ5eaYwnzwRdE1QRUt2QalpX3IRhOPp5aXHBbtz4ry111YlS3RZ0kDVz/bywuCi4NZuefqkZlIpXNq0oHAn1EgYeGrAQy9hQEH972lLG208GrPEM8WzPoynhnKchOf/HH7etR8N3Rpa4ldiG0Mjx6dY+qrrt+9bVo/9GY7MF4YoV3f89bUGH2zcV4H9hk/Jj8Rpwx0jKm09/CRJZlVqZ1yzL5LPnHtXDEHpldRcN5gmIfPWPcJ3z3MezRAPx0ePtxEuyCkh1dyuCp/fR2MvLK+6/4+a1qxx5ERtn2E4vICZ+XAnAGGbsU3d3j6u/N/Wy14A295kJW2bkUfRKspgdYSYlZgpIKje3sOCRvRezrwJk+cbBZYNmGLzQKLiDwA5SF0BvyA6sSydvuW+qBFLbIy9nbOycn1+UT81EMBD3i0/zPFIfdHpJoNePi7PXH2+LsgwPN4zxBQIQubR7cXvQ4sGsySIAJR0TExdt8mlDunLOuznGkLS5mdBARHtVclkQWHYARFSBg20CZ0LAwet8UDXADg2QIi4tI8qAhoZTbg4aqWWGPJvpUwW6NF1Wc4jRxfQCND94J97RoiQf2FQ8zsxwy+sAbM/noN95H3EYRq0kYuu873Ww24IGBhUjNLoq0ATs8T6C1LX0kUNFUun1QERafR+Bxj3w0cXNRmjew6gwm9UMjboheTnnpt7jfgzwwMCgumi3EWsh7kEMZHeKFUfi6dK4ggPNCCOQjxo0fMiTODpMUFX5fN4FZL93tQWN0QGyGPqsyasnTyUt8w5Dxd6qZ5BaTa76cJrTyKT+IZhNPR4qygmeQ9fLB6fy6g36r2Oidhz7Zd9zDyrpz1t/2JmRUbv24XV7Ojkpqel2gxgrE3oHdqJqC+p97CcmJvZIV7xfbziSRG9Dgi9oyg3JpicxoON8tCG7X9QWNIZkVv4ro7WB/n61Wl36kVtlZTUEB4wnESXzjKTIQSLRgbLvaQiJeZB0nY9DbQC5qtC5jJYl5BSDJh8aiYSOZvUSPYBZGaSG0eKcJh74HgFHnYzk//nnn17ZsbExz+Oo4Xqm+theP8rx4MEDXxVAeOLixeDrI+m7vaM9oMkIL4D4cyaTlrIfdmlhrYUmAB16wJGAYehC6v6AanIKZVI+Dk57RJx8eY590NmcD350WobFR5uuUjY12cvSsISVc2uWUsMGtaPGEeQImh537949++uvv+zOnTuuL4vFon355ZdbMHbD4fiwDRDB8uzu7/T8Bw8f2K//+dUePXpkn3/+uX3xxRc+sMIj2Z72Ab3qBac7sOLo1q3/c1frnJYBzL6ak8EpexQOnUwwqU/3pTCQkFTaAux3AZT/DNvVExw4Nwb4zQc8akcY1RIpzSNqAiCZldTXXfcJtQ3JwA0NDTlol3AZv++//96333//3XsAvYBrACACyHfgAJdrSNlhQVM+8qOXx/xQDxwj0ZNPJ+2HH37w7whnDBW8ETQZo9x56Nq1a66L0H9I9uDgoK1V6pbKysLK5Utle+Ux9Np7ly55QAmNEmCSS0tVoEKYpsIndhXDTokGCRLesBfT09bdP6fZ9BFj2cHMiylBzlmfZltwpZBWJgTQiXTNCJPYOCoEYwQIEvegTm7fvr1lqK5fvy53cUxuap/3Fr/xgB+EbG/+702bk5BhbDG0sBjRbD12gTLQsOwpAw2wO+2RaG6itZiIpeWoAAUn87y6Q14LElPyMgoFLWxJyQCkCnrhqNbS5dzcARJ5BSP6lSUIa2urHgcpKK8oUc5cd9ErcCXz3X2WK/Tb6LkxDVDkN5fWtGxsWBLS72W4fPmyg8L7oExU+Pz58+6FUFnAU0ZUGPegVr777juPa9MzuY5UY8Q2Nw++YhVBAPS//vtf3suJjzPVhvfz1VdfSZv228TFCa1vSdklCRzHcNuddpyJ0kXrsFEwwCBRfGdj4UxFhV5VcKmWlLVfXrNns4tWiAax+QbyIhg1o+jcnQf37OqVqyrQuEt1gB1Qx3curbCiqSZ3Ul1U4Hnn6NmzxoJJIFFBgP38888+Ivvoo4/sm2++sc8++8z964cPHzpEnptW72DaDT1OPXD7JuW10DDAcHuym8Q+x5QPKSUvGhdPg/xpTGwNOhkjSG9hT69DfexOO0BzkYJRMQpDoaMHwJ6FL9mMfMfNmhvCtLySrAxmr7o43TxKqeto5ZWraqBR7bUL50ZteFATrt1a56GGAzT/SC7R6kU5GlJ6nmheXsYVyTsruD09BR+McEx6rOmtYrHoZaNyZ9UYdFmuU3byRqq4hspDzQCIkCu9gyR2us+/HugDfXvjxg3v5fQabAX5UVbAAp8yARhm7RpyB2haj8KiPigcD9GaUbIpFQMM6QsBEpxC1s7099jlC2ekGnDxWgnY5HPl4oh98fFVbyRmZ9DTeyV604b6u5VHzob6um1eeZZUaEaBuVzGpYmyoCJY8kBX9sYSLSrFRuXR1dGXBjZSiDQD4JNPPnEoUYeGMrTKu983mKAqvv32W29kBk30IspG/rChMbkHZu0gk/cO0JygICRaMeoauiwZ4gUg2UkfditSx4hjn4TEsnwgoQUdvheUAIcH9j7ner15GneP96OLU1rXR4pCgJRirDkmkSeVw1jTE3GzaBTOo25oAMpO49AI0fM4DGjypdfwLICxWRxjy5BmRq+B1d56eSH1sQM0hSdTEq1DxhxHiea7r0QS6NggwfKFSvuD2z4cLFBDVHXbldd81e28D9AAa2ipL5LDu3knkOl1lDXCYo9EUfE5rXKl3ORRLBb3vIjnYiPtubjPCfKnPGwkyuIs9B7ey4g1NOA+Gej0DtDc5nCUMSlWLjYA8Y8EoziBa4/WH/vbHwAmeoeUrKysuuFBgigH0hsBb38R9yJtqIyYuL/dvfH6UexpUJ9xCsj2zXIHaArFSn0KSDSM7oae5TzQmXEpFLqUcTRl++b71hfIGdB5/fQCqADGwqN/UWEYPwzfboCh7ClvHMr/LlIsQ9y/7p07QKM7saRIB92TqSQSyp5Ko+O6pXfVYzy9oRHDTW/xCehNhU6Jq6AO0MsYISz8Bx984LqXbHdXMB7H/Vu8+tge2QEajUElsdIYEn4+gX7EVUI3VuU7421oTUCo5HGQljBmtFI1pdkV9B7vQzfjP7Ow/euvv/b1Jf9EmK9rpWDSm3dQeCrH0JIACYoe6UaKOLex0TRCbbyG173kcNcUVJLeI6JHvBoDxCCDwcbY+TGHjCfRaWmHRFN4YOMqUZmZmRkHT5wAyX70+GmwgschyZGc3k/0TsMjl+Se7l5jFPjpp5967IWy0fidlvaUOHZJDAr6kQ114t1YhhFh9nswOMdkc3hfNomrWRXUpI/Cot3oNMCxvDtURzwZ9xhE9CMVxxiGKBwDj8D4mDh7gIZZcN5PA2MvaFx61bvyKCKDo9q3Be3Cqg9cOyqGzgQ0QRQqHJceHFUhducDXNzMCBr/mAZnREaZOjG1BY284jcDN62gERUHOOf05djrydJdeg0+NAm9zCQxoz4vw7GX4OhfsEdH8wqkhp8hoxdzCiIBGughIdHHaQ3xHsM7cCkBi7u5quAQEh4HUM3CdMyuLegQUwhBFAI7oSszxSQVokGEe3fAPkLeO7PS5IHUVFk6OdqIGMgBPL3ruBv7qFuwLWgkhyF4GMeHn6rxnQlaoDdi1G6HFuFgJ66DFpaQaisrQdSDnGGtH2XxiVqpEYbhnaqj24JmqE2cA9WBx4HxY89auJRA13wFf0ADEIyk/uu+Fq6DQvZFN5LQmJs/5+0VlptRFuAi2WwnBjTdksqxKAS9jOrArQuge1x1NDRCJDZNpVmfURGAtLa3keg4w4JK8PzY632cj6uj+B0jYVvuiffRszop7ZFoQOOvYuF9QlagAY/q4BjprteoMFLG5OuG/m5HVRKJGB5edTho5VWpKjqon1hUapJcwMogMu0VvZ0YDqAx2DoeNFISJZrYLjYP6BgfBg4LyzJQ0pusyk/IM1ldU6MslvTXaBSr1rMt5dH6Rp6ttL0xpDJ0G+BKZf1ETitVS5qcrQl2UvYgrwge60Vw8wiR0qsi6FZ+nfFtj0RTbHQzwRyWwBKeJObx3nvv2cSloq3efSiJrlh1Xa5XI2ELczP2WH+VgB8LvRVovQ94C/P8xnzZckvqQZVBy430e2yDVUo//vijLx/AzSN1msdBmduCRnqI/RIHZqCAKgH8OQXdHzx6opntdVtfWZJRXLaK4DSqGE6tAhJ4LZkQ8CDNUXY5io2ABNNLWmcYA23apGa3lzXy46fMZU3oZjPjAv2+G2Xi4sTEAc1a7ZZPTz6dkfaARloYiREmxcVj0MA5X5wiA5TXn4tQXM0qa2E9ckU/6HlyV3EQuR1scbAB2RZoDUDEA98CY0Z+u2Eh1cShu+pSIatF//HR2IUxb4Ri8ZLvUSXAZtlDp6W2oFEdGJ9o6TnG+DCVxSKYiiScv/JFfDr+BgWpZAMiGynA3YkEbwXsu0GzcpV3MP925UrR/1hKNID0MHxp4h+Uhe+dlvRHuejMB0tII+qE5WJsYTmA1nhIGrcD3p3bm14Rn8VPRk3RozC8Mf/d+XXi8aFAAwwYeCUxsoZkRpBRkneCQNJ3ntl+FIQ/SCj50JgsF+YPryDh7fPcnkNnfD8U6M6o0j+zlDEk988s3Qkq1Snod9SYp6BPQb8jAu/oNSlcs9N0/AT+H9SM9UHFsMakAAAAAElFTkSuQmCC'; break;
			default: dat = 'data:image/png;base64,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'; break;
		}

		return new Promise(resolve => {

			resolve(dat);

		});

	}


	stub_getCatalogProductOptionGroups(catalogId, productId) {

		var res;
		return new Promise(resolve => {

			res = [
				{
					"id": "359_HD",
					"name": "359 Heavy Duty",
					"image": "image_0004",
					"options": [
						{
							"id": "Opt_CaseB",
							"name": "Warranty"
						},
						{
							"id": "Opt_CaseC",
							"name": "Exterior & Misc."
						},
						{
							"id": "Opt_CaseD",
							"name": "Shipping & Installation"
						},
						{
							"id": "Opt_CaseA",
							"name": "Hardware",
						}
					]
				}
			];

			resolve(res);

		});

	}

	stub_getCatalogProductOptionGroupsExpanded(catalogId, productId, optionId) {

		var res;
		return new Promise(resolve => {

			if (optionId == 'Opt_CaseA') {

				res = {
					"id": "Opt_CaseA",
					"name": "Hardware",
					"type": "table",
					"selection_type": "text",
					"options": [
						{
							"id": "Opt_CaseA_1",
							"order_code": "Opt_CaseA_1",
							"type": "quantity",
							"name": "Hardware Option 1",
							"price": 450,
							"min": 0,
							"max": 1000,
							"user_input": null
						},
						{
							"id": "Opt_CaseA_2",
							"order_code": "Opt_CaseA_2",
							"type": "quantity",
							"name": "Hardware Option 2",
							"price": 700,
							"min": 0,
							"max": 1000,
							"user_input": null
						},
						{
							"id": "Opt_CaseA_3",
							"order_code": "Opt_CaseA_3",
							"name": "Hardware Option 3",
							"type": "quantity",
							"price": 700,
							"min": 0,
							"max": 1000,
							"user_input": null
						}
					]
				};

			}
			else if (optionId == 'Opt_CaseB') {

				res = {
					"id": "Opt_CaseB",
					"name": "Warranty",
					"type": "table",
					"selection_type": "radio",
					"user_input": null,
					"options": [
						{
							"id": "Opt_CaseB_1",
							"order_code": "Opt_CaseB_1",
							"type": "text",
							"name": "24-Month Warranty Option",
							"price": 800
						},
						{
							"id": "Opt_CaseB_2",
							"order_code": "Opt_CaseB_2",
							"type": "text",
							"name": "6-Month Warranty Option",
							"price": 300
						},
						{
							"id": "Opt_CaseB_3",
							"order_code": "Opt_CaseB_3",
							"type": "text",
							"name": "No Warranty Option",
							"price": 300
						}
					]
				};

			}
			else if (optionId == 'Opt_CaseC') {

				res = {
					"id": "Opt_CaseC",
					"name": "Software",
					"type": "table",
					"selection_type": "multiple",
					"user_input": [],
					"options": [
						{
							"id": "Opt_CaseC_1",
							"order_code": "Opt_CaseC_1",
							"type": "text",
							"name": "24-Month Base Software Pkg",
							"price": 450
						},
						{
							"id": "Opt_CaseC_2",
							"order_code": "Opt_CaseC_2",
							"type": "text",
							"name": "Addl 12-Month Software Pkg",
							"price": 700
						},
						{
							"id": "Opt_CaseC_3",
							"order_code": "Opt_CaseC_3",
							"type": "text",
							"name": "Addl 24-Month Software Pkg",
							"price": 1000
						}

					]
				};
			}
			else if (optionId == 'Opt_CaseD') {

				res = {
					"id": "Opt_CaseD",
					"name": "Shipping & Installation",
					"type": "table",
					"selection_type": "item_drop_down",
					"options": [
						{
							"id": "Opt_CaseD_1",
							"order_code": "Opt_CaseD_1",
							"type": "text",
							"name": "Installation",
							"options": [
								"On-Site",
								"Off-Site"
							],
							"price": 450,
							"user_input": null
						},
						{
							"id": "Opt_CaseD_2",
							"order_code": "Opt_CaseD_2",
							"type": "text",
							"name": "Shipping",
							"options": [
								"3-Day Freight",
								"Standard",
								"Next Day Express"
							],
							"price": 700,
							"user_input": null
						},
						{
							"id": "Opt_CaseD_3",
							"order_code": "Opt_CaseD_3",
							"type": "text",
							"name": "Delivery Fee",
							"options": [
								"Included",
								"Excluded"
							],
							"price": 1000,
							"user_input": null
						}

					]
				};
			}
			resolve(res);

		});

	}

	stub_addProductToQuote(quoteId, productData) {

		/*
		productData = {
			quoteId: "9182312",
			productId: "as8d8123",
			catalogId: "0183123",
			groupIds: ["97123","0128321"],
	
			options: [
				{
					id: "Opt_CaseA_1",
					order_code: "Opt_CaseA_1",
					quantity: 20
				},
				{
					id: "Opt_CaseB_2",
					order_code: "Opt_CaseB_2"
				},
				{
					id: "Opt_CaseB_3",
					order_code: "Opt_CaseB_3"
				},
				{
					id: "Opt_CaseC_2",
					order_code: "Opt_CaseC_2"
				},
				{
					id: "Opt_CaseD_2",
					order_code: "Opt_CaseD_2",
					value: "Standard"
				},
				{
					id: "Opt_CaseD_3",
					order_code: "Opt_CaseD_3",
					value: "Excluded"
				}
			]

		}
		*/

		return new Promise(resolve => {

			/*if (productData.options.length < 1) {
				// Global Error - show in toast notification
				resolve({
					type: 'error',
					message: "Please select an option"
				});
			}

			if (productData.options[0].id == "Opt_CaseA_1") {
				// Option-specific-error - show as tooltip & highlight red
				resolve({
					type: 'error',
					optionId: "Opt_CaseA_1",
					message: "Cannot choose this option"
				});

			}
			else {

				// Global Success - show in toast notification
				resolve({
					type: 'success',
					message: "Product Added Successfully"
				});

			} */

			resolve({

				// Global Success - show in toast notification
					type: 'success',
					message: "Product Added Successfully"
				/*
				type: 'error',
				optionErrors: [
					{
						optionId: "Opt_CaseA_1",
						message: "Cannot choose this option"
					},
					{
						optionId: "Opt_CaseA_3",
						message: "Invalid quantity"
					}
				]
				*/
			});

		});

	}


	stub_getOpportunities() {


		// params.filterBy = {

		//   // radio select options:
		//   //   expiredCatalogs
		//   //   expiredQuotes
		//   //   checkedOut
		//   //   viewOnly
		//   'quotes': 'expiredCatalogs', 

		//   // radio select options:
		//   //   today
		//   //   last7Days
		//   //   last30Days
		//   'dateModified': null,

		//   'currency': "USD",
		//   'owner': null,
		//   'status': null
		// }

		return new Promise(resolve => {

			let result = [
				{
					'id': '01',
					'customer': "Salient Solutions",
					'status': "Staging",
					'country': "Brazil",

				},
				{
					'id': '02',
					'customer': "Opportunity 2",
					'status': "Created",
					'country': "Brazil",

				},
				{
					'id': '03',
					'customer': "Opportunity 3",
					'status': "Created",
					'country': "Brazil",

				},
				{
					'id': '04',
					'customer': "Opportunity 4",
					'status': "Proposed",
					'country': "Singapore",

				}
			];

			resolve(result);

		});

	}

	stub_getOpportunityQueryFilters(){

		return new Promise(resolve => {
			
			let result = {

				// radio select options:
				//   expiredCatalogs
				//   expiredQuotes
				//   checkedOut
				//   viewOnly
				'quotes': [
					'expiredCatalogs', 
					'expiredQuotes',
					'checkedOut',
					'viewOnly'
				 ],

				// radio select options:
				//   today
				//   last7Days
				//   last30Days
				'dateModified': [
					'today',
					'last7Days',
					'last30Days'
				],

				'currency': "USD",
				'owner': null,
				'status': null

			}

			resolve(result);
		
		});

	}

	stub_getOpportunityDetail(){

		return new Promise(resolve => {
			
			let result = {


			}

			resolve(result);
		
		});


	}

	stub_getQuotes(params) {

		/*
			 params.filterOptionValues
			 {
					quotes: 'expiredQuotes',
					dateModified: 'today',
					currency: 'USD',
					owner: null,
					status: null
			 }
		*/
		if (params.filterOptionValues) {

			return new Promise(resolve => {

				let result = [
					{
						'id': '01',
						'accountName': "Account A1",
						'opportunityName': "Opportunity O1",
						'quoteName': "Quote Q1",
						'access': 'CHECKED_OUT',
						'lastModified': {
							'date': '6.21.2017',
							'time': '2:45 PM'
						},
						'status': 'waitingForApproval'
					}
				]
				resolve(result);

			});

		}


		if (params.isOnline) {

			return new Promise(resolve => {

				let result = [
					{
						'quoteId': '01',
						'accountName': "Account A1",
						'opportunityName': "Opportunity O1",
						'quoteName': "Quote Q1",
						'access': 'CHECKED_OUT',
						'lastModified': {
							'date': '6.21.2017',
							'time': '2:45 PM'
						},
						'status': 'waitingForApproval',
						'priceList': "BRL for Brazil",
						'totalPrice': '870,000.00 BRL',
						'country': 'Brazil'
					},
					{
						'quoteId': '02',
						'accountName': "Account A2",
						'opportunityName': "Opportunity O2",
						'quoteName': "Quote Q2",
						'access': 'VIEW_ONLY',
						'lastModified': {
							'date': '6.21.2017',
							'time': '2:45 PM'
						},
						'status': 'waitingForApproval',
						'priceList': "BRL for Brazil",
						'totalPrice': '870,000.00 BRL',
						'country': 'Brazil'
					},
					{
						'quoteId': '03',
						'accountName': "Account A3",
						'opportunityName': "Opportunity O3",
						'quoteName': "Quote Q3",
						'access': null,
						'lastModified': {
							'date': '6.21.2017',
							'time': '2:45 PM'
						},
						'status': 'waitingForApproval',
						'priceList': "BRL for Brazil",
						'totalPrice': '870,000.00 BRL',
						'country': 'Brazil'
					}
				];

				resolve(result);

			});

		}
		else {

			return new Promise(resolve => {

				let result = [
					{
						'quoteId': '01',
						'accountName': "Account A1",
						'opportunityName': "Opportunity O1",
						'quoteName': "Quote Q1",
						'access': 'VIEW_ONLY',
						'lastModified': {
							'date': '6.21.2017',
							'time': '2:45 PM'
						},
						'status': 'waitingForApproval',
						'priceList': "BRL for Brazil",
						'totalPrice': '870,000.00 BRL',
						'country': 'Brazil'
					},
					{
						'quoteId': '03',
						'accountName': "Account A2",
						'opportunityName': "Opportunity O2",
						'quoteName': "Quote Q2",
						'access': 'VIEW_ONLY',
						'lastModified': {
							'date': '6.21.2017',
							'time': '2:45 PM'
						},
						'status': 'waitingForApproval',
						'priceList': "BRL for Brazil",
						'totalPrice': '870,000.00 BRL',
						'country': 'Brazil'
					},
					{
						'quoteId': '03',
						'accountName': "Account A3",
						'opportunityName': "Opportunity O3",
						'quoteName': "Quote Q3",
						'access': 'CHECKED_OUT',
						'lastModified': {
							'date': '6.21.2017',
							'time': '2:45 PM'
						},
						'status': 'waitingForApproval',
						'priceList': "BRL for Brazil",
						'totalPrice': '999,999.99 BRL',
						'country': 'Brazil'
					}
				];

				resolve(result);

			});

		}

	}

	stub_getQuoteSummary(id) {

		return new Promise(resolve => {

			let result = [
				{
					'id': '01',
					'accountName': "Account A1",
					'opportunityName': "Opportunity O1",
					'quoteName': "Quote Q1",
					'access': 'VIEW_ONLY',
					'lastModified': {
						 'date': '6.21.2017',
						'time': '2:45 PM'
					},
					'status': 'waitingForApproval',
					'priceList': "BRL for Brazil",
					'totalPrice': '870,000.00 BRL',
					'country': 'Brazil'
				}
			];

			resolve(result);

		});

	}

	stub_getQuoteSummaryVisibleFields() {

		return new Promise(resolve => {

			let result = {

				'quoteName': true,
				'id': true,
				'status': true,
				'priceList': true,
				'totalPrice': true,
				'country': true

			}

			resolve(result);

		});

	}

	stub_getQuoteSummaryEditableFields() {

		return new Promise(resolve => {

			let result = {
				'quoteName': {
					type: 'text',
					options: null,
					value: ''
				},
				'status': {
					type: 'selection',
					options: ['In Progress', 'Waiting', 'Done'],
					value: ''
				},
				'country': {
					type: 'text',
					options: null,
					value: ''
				}
			}

			resolve(result);

		});

	}

	//LOGIN METHODS
	/*
	public login(credentials) {
		if (credentials.email === null || credentials.password === null) {
			return Observable.throw("Please insert credentials");
		} else {
			return Observable.create(observer => {
				// At this point make a request to your backend to make a real check!
				let access = (credentials.password === "admin" && credentials.user === "admin");
				console.log("login " + credentials.password + credentials.user )
				//this.currentUser = new User('admin', 'admin');
				observer.next(access);
				observer.complete();
			});
		}
	}
 
	public registerUser(credentials) {
		if (credentials.username === null || credentials.password === null) {
			return Observable.throw("Please insert credentials");
		} else {
			// At this point store the credentials to LDS
			
			this.currentUser = new User(credentials.username, credentials.password);
		}
	}
 
	public getUserInfo() : User {
		return this.currentUser;
	}
 
	public logout() {
		return Observable.create(observer => {
			this.currentUser = null;
			observer.next(true);
			observer.complete();
		});
	}
	*/


	//
	//
	//
	//




}
