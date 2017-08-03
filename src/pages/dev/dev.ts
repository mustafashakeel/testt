import { Component, OnInit } from '@angular/core';
import { NavController } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { AlertController } from 'ionic-angular';
import { ToastController } from 'ionic-angular';
import { CPQRestApiProvider } from '../../providers/cpq-rest-api/cpq-rest-api';
import { Login } from '../login/login';
import { TabsPage } from '../tabs/tabs';

// ***** for progress bar plugin
//import {NgProgressService} from 'ngx-progressbar';

@Component({
  selector: 'page-dev',
  templateUrl: 'dev.html'
 
})

export class DevPage {

  public isDatabaseReady: boolean;
  public settings: any;
  public notifications: any;
  public myCPQDriveSummary: any;

  constructor(public navCtrl: NavController,
              private alertCtrl: AlertController,
              private toastCtrl: ToastController,
              public localDataService: LocalDataServiceProvider,
              public restApi: CPQRestApiProvider
              ) {

    this.isDatabaseReady = null;

    this.restApi = restApi;
    this.notifications = [];
    this.myCPQDriveSummary = {};
    this.localDataService.initDatabase().then(res => {

      this.localDataService.getSettings().then(res => {

        this.settings= res;
        this.isDatabaseReady = true;
      });
    
    });


  }

  goHomePage(){

    this.navCtrl.push(TabsPage, {

    });
  }

  goOnline(){
    this.localDataService.setSettings({ onlineMode: true });
  }

  goOffline(){
    this.localDataService.setSettings({ onlineMode: false });
  }

  goLoginPage(){

    this.navCtrl.push(Login, {

    });

  }

  testLoginUserA(){

    let params = {
      username: 'tomp@appnovation.com',
      password: 'test12345'
    };
    this.restApi.login(params).then(data => {
       let res: any = data;
      if(res.success){
        // success
        this.showToast('success', res.message);
      }
      else{
        // error
        this.showToast('error', res.message);
      }

    });

  }
  testLoginUserB(){

    let params = {
      username: 'mustafa@appnovation.com',
      password: 'auc98361'
    };
    this.restApi.login(params).then(data => {
       let res: any = data;
      if(res.success){
        // success
        this.showToast('success', res.message);
      }
      else{
        // error
        this.showToast('error', res.message);
      }

    });

  }

  testRefreshAll(){

    this.showToast('info', "Refreshing All");
    this.localDataService.refreshAll().then(data => {
      let res: any = data;
      if(res.success){
        // success
        this.showToast('success', res.message);
      }
      else{
        // error
        this.showToast('error', res.message);
      }
    });


  }

  testFlatOptions(){

    this.localDataService.getCatalogProductOptionsFlattened('xxa0000000000001', 'Mg').then( data => {


      debugger;

    });


  }

  testAcquireLock(){

    this.showToast('info', "Acquiring Lock");
    this.restApi.acquireLockForQuoteId('03a000012a6ijj3j').then( data => {

      let res: any = data;
      if(res.changes.length==2){
        // success
        this.showToast('success', 'Lock Acquired');//res.message);
      }
      else{
        // error
        this.showToast('error', 'Lock Failed'); //res.message);
      }

    });
  }

  testReleaseLock(){

    this.showToast('info', "Releasing Lock");
    this.restApi.releaseLockForQuoteId('03a000012a6ijj3j').then( data => {

      let res: any = data;
      if(res.success){
        // success
        this.showToast('success', 'Lock Released');//res.message);
      }
      else{
        // error
        this.showToast('error', 'Lock Release Failed'); //res.message);
      }

    });

  }

  testRefreshQuotes(){

    this.showToast('info', "Refreshing All Quotes");
    this.localDataService.refreshAllQuotes().then(data => {
      let res: any = data;
      if(res.success){
        // success
        this.showToast('success', res.message);
      }
      else{
        // error
        this.showToast('error', res.message);
      }
    });


  }

  testRefreshQuote(){

    this.showToast('info', "Refreshing Quote");
    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions

    this.localDataService.refreshQuote(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        // success
        this.showToast('success', res.message);
      }
      else{
        // error
        this.showToast('error', res.message);
      }
    });


  }


  testRefreshCatalogs(){

    this.showToast('info', "Refreshing All Catalogs");
    this.localDataService.refreshAllCatalogs().then(data => {
      let res: any = data;
      if(res.success){
        // success
        this.showToast('success', res.message);
      }
      else{
        // error
        this.showToast('error', res.message);
      }
    });


  }

  testGetObjects(){

    debugger;
    this.restApi.getAccounts().then(data => {

      let res: any = data;
      debugger;

    });

  }


  //
  // Test ACTIONS
  //

  testRemoveCatalogFromLocal(){

    let catalogId = 'xxa0000000000003';

    var that = this;
    this._doConfirmAction({

      actionText: "remove catalog "+catalogId+" from local storage",
      actionFn: function(){

        that.showToast('info', "Removing catalog "+catalogId+" from local storage");
        that.localDataService.removeCatalogFromLocal(catalogId).then(data => {
          let res: any = data;
          if(res.success){
            that.showToast('info', res.message);
          }
          else{
            that.showToast('error', res.message);
          }
        });
        
      }

    });
  }

  testEditProduct(){

    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions
    let product = {
      Id: '44a000012a6ijj3n'
    };
    this.localDataService.saveProduct(quoteId, product);
  }

  testAddProductToQuote(){

    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions
    let product = {
      BaseListPrice: 73257,
      CurrencyIsoCode: 'USD',
      Id: "44a000012a6ijj3n",
      IsSelected: true,
      Name: "359 Heavy Duty Standard",
      OrderCode: "359_HD",
      ParentQuoteId: {
        Id: '03a000012a6ijj3j'
      },
      Quantity: 1,
      //fpRules
      quoteId: '03a000012a6ijj3j'
    };

    this.localDataService.addProductToQuote(quoteId, product).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        this.showToast('error', res.message);
      }
    });
  }

  testCopyProduct(){

    this.showToast('info', "Copying Product");
    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions
    let productId = '44a000012a6ijj3n';

    this.localDataService.copyProduct(quoteId, productId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        this.showToast('error', res.message);
      }
    });
  }

  testCopyQuoteWithProducts(){

    this.showToast('info', "Copying Quote With Products");
    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions
    this.localDataService.copyQuoteWithProducts(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        this.showToast('error', res.message);
      }
    });

  }

  testCopyQuoteOnly(){

    this.showToast('info', "Copying Quote Only");
    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions
    this.localDataService.copyQuoteOnly(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        this.showToast('error', res.message);
      }
    });


  }

  testCheckOutQuote(){

    this.showToast('info', "Checking Out Quote");
    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions
    this.localDataService.checkOutQuote(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        this.showToast('error', res.message);
      }
    });

  }

  testCheckInQuote(){

    this.showToast('info', "Checking In Quote");
    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions
    this.localDataService.checkInQuote(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        let items: any = [];
        if(res.errorItems){
          for(var i=0; i<res.errorItems.length; i++){
            items.push({
              id: res.errorItems[i].id,
              text: res.errorItems[i].label+': '+res.errorItems[i].message
            })
          }
          this.doShowActionReport({
            title: 'Check In Error',
            subTitle: res.message,
            items: items
          });
        }
        else{
          this.showToast('error', res.message);
        }

      }
    });

  }

  testCheckInAllQuotes(){

    this.showToast('info', "Checking In All Quotes");
    let opportunityId = '08a000012a6ijj2y'; // Opportunity for Salient Solutions
    this.localDataService.checkInAllQuotes(opportunityId).then(data => {

      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{

        let items: any = [];
        if(res.errorItems){
          for(var i=0; i<res.errorItems.length; i++){
            items.push({
              id: res.errorItems[i].id,
              text: res.errorItems[i].quote.Name+': '+res.errorItems[i].message
            })
          }
          this.doShowActionReport({
            title: 'Check In Error',
            subTitle: res.message,
            items: items
          });
        }
        else{
          this.showToast('error', res.message);
        }
      }

    });

  }

  testGetQuote(){

    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions
    this.restApi.getQuote(quoteId).then(data => {
      debugger;
    })

  }

  testSaveQuote(){

    this.showToast('info', "Saving Quote");
    let quoteId = '03a000012a6ijj3j'; // Quote for Salient Solutions
    this.restApi.getQuote(quoteId).then(data => {

      let quote = data;
      this.localDataService.saveQuote(quoteId, quote, true).then(data => {
        let res: any = data;
        if(res.success){
          this.showToast('info', res.message);
        }
        else{

          let items: any = [];
          for(var i=0; i<res.errorItems.length; i++){
            items.push({
              id: res.errorItems[i].id,
              text: res.errorItems[i].label+': '+res.errorItems[i].message
            })
          }

          this.doShowActionReport({
            title: 'Check In Error',
            subTitle: res.message,
            items: items
          });

          //this.showToast('error', res.message);
        }
      });

    });
  }

  testCheckOutAllQuotes(){

    this.showToast('info', "Checking Out All Quotes");
    // check out all quotes for opportunity id

    let opportunityId = '08a000012a6ijj2y'; // Opportunity for Salient Solutions

    this.localDataService.checkOutAllQuotes(opportunityId).then(data => {

      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{

        let items: any = [];
        if(res.errorItems){
          for(var i=0; i<res.errorItems.length; i++){
            items.push({
              id: res.errorItems[i].id,
              text: res.errorItems[i].quote.Name+': '+res.errorItems[i].message
            })
          }
          this.doShowActionReport({
            title: 'Check Out Error',
            subTitle: res.message,
            items: items
          });
        }
        else{
          this.showToast('error', res.message);
        }
      }

    });

  }

  testRefreshViewOnly(){

    this.showToast('info', "Refreshing View Only");
    let opportunityId = '08a000012a6ijj2y'; // Opportunity for Salient Solutions

    this.localDataService.refreshViewOnly(opportunityId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        this.showToast('error', res.message);
      }
    });



  }

  testDownloadOpportunityOnly(){

    this.showToast('info', "Downloading Opportunity Only");
    let opportunityId = '08a000012a6ijj2y'; // Opportunity for Salient Solutions

    this.localDataService.downloadOpportunityOnly(opportunityId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        this.showToast('error', res.message);
      }
    });


  }

  testDownloadAllQuotesReadOnly(){

    this.showToast('info', "Downloading All Quotes Read Only");
    let opportunityId = '08a000012a6ijj2y'; // Opportunity for Salient Solutions

    this.localDataService.downloadAllQuotesReadOnly(opportunityId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        this.showToast('error', res.message);
      }
    });

  }

  testDownloadCatalog(){

    this.showToast('info', "Downloading Catalog");
    let catalogId = 'xxa0000000000002';
    this.localDataService.refreshCatalog(catalogId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToast('info', res.message);
      }
      else{
        this.showToast('error', res.message);
      }
    });

  }

  testGetCatalogs(){

    this.restApi.getCatalogs().then(res => {

      let data: any = res;

      console.log(data);

    });

  }

  testGetCatalog(){

    let catalogId = "xxa0000000000002";

    this.restApi.getCatalog(catalogId).then(res => {

      let data: any = res;

      console.log(data);

    });

  }

  testFindUpdatedCatalogs(){

    this.localDataService.findUpdatedCatalogs().then(res => {

      let data: any = res;

      console.log(data);

    });

  }


  //
  // TOASTS & DIALOGS
  //
  //=====================

  doShowActionReport(params){

    let alert = this.alertCtrl.create();
    alert.setTitle(params.title);
    alert.setSubTitle(params.subTitle);
    alert.setCssClass('action-report');
    if(params.items){
      for(var i=0; i<params.items.length; i++){
        alert.addInput({ type: 'radio', label: params.items[i].text, value: params.items[i].id, disabled: true, checked: false });
      }
    }
    alert.addButton({
      text: 'OK'
    });
    alert.present();

  }


  showToast(type, message) {

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

  _doConfirmAction(params){

    let confirm = this.alertCtrl.create({
      title: 'Confirm Action',
      message: 'Are you sure you want to '+params.actionText+'?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'OK',
          handler: () => {
            console.log('OK clicked');
            params['actionFn']();
          }
        }
      ]
    });
    confirm.present();

  }

  //
  //
  //



  presentConfirm() {
  
    let alert = this.alertCtrl.create({
      title: 'Confirm Sync',
      message: 'Are you sure you want to sync?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Sync',
          handler: () => {
            console.log('Sync clicked');
          }
        }
      ]
    });
    alert.present();

  }

}
