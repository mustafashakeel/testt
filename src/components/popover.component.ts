import { Component, Output, EventEmitter } from '@angular/core';
import { LocalDataServiceProvider } from '../providers/local-data-service/local-data-service';
import { AlertController, NavParams, NavController, ViewController } from 'ionic-angular';
import { ToastController } from 'ionic-angular';
import { ProductSummary } from '../pages/quote/product-summary';

import { OpportunityDetails } from '../pages/opportunity/opportunity-details';
import { QuoteDetails } from '../pages/quote/quote-details';
import { SelectQuote } from '../pages/quote/select-quote';
import { AddProduct } from '../pages/quote/add-product';


@Component({
  selector: 'page-popover',
  templateUrl: 'popover.component.html'
})
export class PopoverComponent{

  public actions: any;
  public mainCtrl: any;

  public settings: any;
  public objectType: any;
  public objectInstance: any;
  public viewContext: any;

  public configs: any;

  @Output("onClose") eventOnClosed = new EventEmitter();


  constructor(private alertCtrl: AlertController, 
              private toastCtrl: ToastController,
              public localDataService: LocalDataServiceProvider, 
              private params: NavParams,
              private navCtrl:  NavController,
              private viewCtrl: ViewController) {

    this.settings = params.get("settings");
    this.objectType = params.get("objectType");
    this.objectInstance = params.get("objectInstance");
    this.mainCtrl = params.get("mainCtrl");
    this.viewContext = params.get("viewContext");

    this.actions = {
    }


    // TODO - connect to data object
    let inStorage = true; //this.objectInstance._isViewOnly;
    let isCheckedOut = this.objectInstance._isCheckedOut;
    let isViewOnly = !this.objectInstance._isCheckedOut;

    let isOnline = this.settings.onlineMode;

    this.configs = {

      quoteline: {
        //updateAvailable: ['isOnline', 'isCheckedOut'],

      }

    }

    //
    // OPPORTUNITY
    //
    if(this.objectType=='account'){

      this.actions = {
        goToQuotes: true,
        checkInAllQuotes: true,
        removeAllQuotes: true
      }

    }
    if(this.objectType=='quoteline'){

      this.actions = {
        updateAvailable: true,
        copyProduct: true,
        editProduct: true,
        removeFromQuote: true
      }

    }
    if(this.objectType=='catalog'){

      this.actions = {
        viewNotes: true,
        goToQuotes: true,
        removeCatalog: true
      }

    }

    //
    // OPPORTUNITY
    //
    if(this.objectType=='opportunity'){
       
      if(this.viewContext=='BRIEFCASE'){
        // VIEWING IN BRIEFCASE
        if(isOnline){
          this.actions = {
            goToOpportunitySummary: true,
            removeFromCPQDrive: true
          }
        }
        else{
          this.actions = {
            refreshViewOnly: true,
            checkInAllQuotes: true,
            removeFromCPQDrive: true
          }
        }

      }
      else{
        // VIEWING IN ALL OTHER CONTEXTS
        if(inStorage){
          // IN STORAGE
          if(isOnline){
            // ONLINE
            this.actions = {
              goToQuotes: true,
              checkInAllQuotes: true,
              checkOutAllQuotes: true,
              removeAllQuotes: true
            }
          }
          else{
            // OFFLINE
            this.actions = {
              goToQuotes: true,
              removeAllQuotes: true
            }
          }
        }
        else{
          // NOT IN STORAGE
          if(isOnline){
            // ONLINE
            this.actions = {
              goToQuotes: true,
              downloadOpportunityOnly: true,
              downloadAllQuotesReadOnly: true,
              checkOutAllQuotes: true
            }
          }
          else{
            // OFFLINE
            // NOT SUPPORTED
          }

        }

      }
      

    }



    if(this.objectType=='quote'){
      
      if(this.viewContext=='BRIEFCASE'){
        // VIEWING IN BRIEFCASE
        if(isOnline){
          this.actions = {
            goToQuoteSummary: true,
            removeFromCPQDrive: true
          }
        }
        else{
          this.actions = {
            checkInQuote: true,
            removeFromCPQDrive: true
          }
        }

      }
      else{
        // VIEWING IN ALL OTHER CONTEXTS
        if(isOnline){
          // ONLINE
          if(isCheckedOut){
            this.actions = {
              goToProducts: true,
              checkInQuote: true,
              copyQuoteWithProducts: true,
              viewBOMDetails: true,
              viewProposal: true,
              removeFromCPQDrive: true,
            }  
          }
          else if(isViewOnly){
            this.actions = {
              goToProducts: true,
              refreshQuote: true,
              checkOutQuote: true,
              viewBOMDetails: true,
              viewProposal: true,
              removeFromCPQDrive: true,
            }
          }
          else{
            this.actions = {
              goToProducts: true,
              copyQuoteOnly: true,
              copyQuoteWithProducts: true
            }
          }
        }
        else{
          // OFFLINE
          if(isCheckedOut){
            this.actions = {
              goToProducts: true,
              copyQuoteOnly: true,
              copyQuoteWithProducts: true,
              removeFromCPQDrive: true
            }
          }
          else if(isViewOnly){
            this.actions = {
              goToProducts: true,
              copyQuoteOnly: true,
              removeFromCPQDrive: true
            }
          }
          else{
            this.actions = {
              goToProducts: true,
              copyQuoteOnly: true,
              copyQuoteWithProducts: true,
              removeFromCPQDrive: true
            }
          }
        }
      }
    }



/*
            goToProducts: true,
            copyQuoteOnly: true,
            copyQuoteWithProducts: true,
            removeFromCPQDrive: true
            checkInQuote: true,
            viewBOMDetails
            viewProposal
            refreshQuote
            checkOutQuote
        */
    
    // ALL 

    // this.localDataService.getOnlineStatus()
    // .then(data => {
    //   this.onlineStatus = data;
    // });

    

  }



  doGoToQuotes(){

    this.mainCtrl.push(SelectQuote,{
      opportunityId: this.objectInstance.Id,
      opportunity: this.objectInstance
    });
    this.viewCtrl.dismiss();

  }

  doRemoveAllQuotes(){
    this.doAction("LocalDataService\nremoveAllQuotes");
  }

  doCheckInAllQuotes(){

    this.showToast('info', "Checking In All Quotes for Opportunity");
    // TODO - handle case when objectInstance is an account

    let opportunityId = this.objectInstance.Id;
    this.localDataService.checkInAllQuotes(opportunityId).then(data => {

      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
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
          this.viewCtrl.dismiss();
        }
        else{
          this.showToastAndDismiss('error', res.message);
        }
      }

    });

  }

  doDownloadOpportunityOnly(){

    this.showToast('info', "Downloading Opportunity Only");
    let opportunityId = this.objectInstance.Id;
    this.localDataService.downloadOpportunityOnly(opportunityId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
      }
      else{
        this.showToastAndDismiss('error', res.message);
      }
    });
  }

  doDownloadAllQuotesReadOnly(){
    this.showToast('info', "Downloading All Quotes Read Only");
    let opportunityId = this.objectInstance.Id;
    this.localDataService.downloadAllQuotesReadOnly(opportunityId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
      }
      else{
        this.showToastAndDismiss('error', res.message);
      }
    });
  }

  doCheckOutAllQuotes(){

    this.showToast('info', "Checking Out All Quotes");
    let opportunityId = this.objectInstance.Id;
    this.localDataService.checkOutAllQuotes(opportunityId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
      }
      else{
        this.showToastAndDismiss('error', res.message);
      }
    });
  }

  doGoToOpportunitySummary(){

    this.mainCtrl.push(OpportunityDetails,{
      opportunityId: this.objectInstance.Id
    });
    this.viewCtrl.dismiss();
  }

  doGoToQuoteSummary(){

    this.mainCtrl.push(QuoteDetails, {
      quoteId: this.objectInstance.Id
    });
    this.viewCtrl.dismiss();

  }

  doGoToProducts(){

    this.mainCtrl.push(ProductSummary, {
      quote: this.objectInstance
    });
    this.viewCtrl.dismiss();

  }

  doRefreshViewOnly(){

    this.showToast('info', "Refreshing View Only");
    let opportunityId = this.objectInstance.Id;
    this.localDataService.refreshViewOnly(opportunityId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
      }
      else{
        this.showToastAndDismiss('error', res.message);
      }
    });

  }

  doCopyQuoteOnly(){

    this.showToast('info', "Copying Quote Only");
    let quoteId = this.objectInstance.Id;
    this.localDataService.copyQuoteOnly(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
      }
      else{
        this.showToastAndDismiss('error', res.message);
      }
    });

  }

  doCopyQuoteWithProducts(){

    this.showToast('info', "Copying Quote with Products");
    let quoteId = this.objectInstance.Id;
    this.localDataService.copyQuoteWithProducts(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
      }
      else{
        this.showToastAndDismiss('error', res.message);
      }
    });

  }

  doRemoveFromCPQDrive(){
    this.showToast('info', "Removing From Briefcase");
    this.doAction('LDS.RemoveFromCPQDrive');
  }

  doCheckInQuote(){

    this.showToast('info', "Checking In Quote");
    let quoteId = this.objectInstance.Id;
    this.localDataService.checkInQuote(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
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
          this.showToastAndDismiss('error', res.message);
        }
      }
    });

  }

  doViewBOMDetails(){
    this.doAction('LDS.ViewBOMDetails');
  }

  doViewProposal(){
    this.doAction('LDS.ViewProposal');
  }

  doRefreshQuote(){

    this.showToast('info', "Refreshing Quote");
    let quoteId = this.objectInstance.Id;
    this.localDataService.refreshQuote(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        // success
        this.showToastAndDismiss('success', res.message);
      }
      else{
        // error
        this.showToastAndDismiss('error', res.message);
      }
    });
  }

  doCheckOutQuote(){

    this.showToast('info', "Checking Out Quote");
    let quoteId = this.objectInstance.Id;
    this.localDataService.checkOutQuote(quoteId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
      }
      else{
        this.showToastAndDismiss('error', res.message);
      }
    });

  }

  doUpdateAvailable(){

  }

  doCopyProduct(){

    this.showToast('info', "Copying Product");
    let quoteId = this.objectInstance.quoteId;
    let productId = this.objectInstance.Product_Id;

    this.localDataService.copyProduct(quoteId, productId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
      }
      else{
        this.showToastAndDismiss('error', res.message);
      }
    });

  }

  doEditProduct(){

    let quoteId = this.objectInstance.quoteId;
    this.localDataService.getCatalogFromDatasetGuid(this.objectInstance.Product_ConfigDatabaseName).then(catalog => {

      this.mainCtrl.push(AddProduct, {
        quoteId: quoteId,
        quotelineInstance: this.objectInstance,
        catalog: catalog
      });
      this.viewCtrl.dismiss();

    });


  }

  doRemoveFromQuote(){

  }

  doViewNotes(){

  }

  doDownloadCatalog(){

    this.showToast('info', "Downloading Catalog");
    let catalogId = this.objectInstance.Id;
    this.localDataService.refreshCatalog(catalogId).then(data => {
      let res: any = data;
      if(res.success){
        this.showToastAndDismiss('info', res.message);
      }
      else{
        this.showToastAndDismiss('error', res.message);
      }
    });

  }

  doRemoveCatalog(){

    var that = this;
    let catalogId = this.objectInstance.id;
    let catalogName = this.objectInstance.name;
    this.doConfirmAction({

      actionText: "remove catalog "+catalogName+" from local storage",
      actionFn: function(){

        that.showToast('info', "Removing catalog "+catalogName+" from Briefcase");
        that.localDataService.removeCatalogFromLocal(catalogId).then(data => {
          let res: any = data;
          if(res.success){
            that.showToastAndDismiss('info', res.message);
          }
          else{
            that.showToastAndDismiss('error', res.message);
          }
        });
        
      }

    });

  }

  doConfirmAction(params){

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

  /**
  
    Displays a title, subtitle, an optional list of items, and OK button

  {
      title: 'Check Out Complete',
      subTitle: 'The following quotes could not be checked out, as they are locked by another user',
      items: [
        { id: 'q1', name: "Quote 1" },
        { id: 'q2', name: "Quote 2" },
        { id: 'q3', name: "Quote 3" },
        { id: 'q4', name: "Quote 4" },
        { id: 'q5', name: "Quote 5" },
        { id: 'q6', name: "Quote 6" }
      ]
    }
  */
  doShowActionReport(params){

    let alert = this.alertCtrl.create();
    alert.setTitle(params.title);
    alert.setSubTitle(params.subTitle);
    alert.setCssClass('action-report');
    for(var i=0; i<params.items.length; i++){
      alert.addInput({ type: 'radio', label: params.items[i].name, value: params.items[i].id, disabled: true, checked: false });
    }
    alert.addButton({
      text: 'OK'
    });
    alert.present();

  }

  showToastAndDismiss(type, message){

    this.showToast(type, message);
    this.viewCtrl.dismiss();

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

  doAction(actionName){

    let alert = this.alertCtrl.create({
      title: 'Invoking',
      message: actionName,
      buttons: [
        {
          text: 'OK',
          handler: () => {

          }
        }
      ]
    });
    alert.present();

  }

}
