import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController, PopoverController, NavParams, LoadingController, AlertController } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { AddProduct } from '../quote/add-product';
import { PopoverComponent } from '../../components/popover.component';

@Component({
  selector: 'product_summary',
  templateUrl: 'product-summary.html'
})


export class ProductSummary {

  public settings: any;
  private disable = null;

  public quotelines: any;
  public quotes_total: any;

  public quote: any;

  constructor(public navCtrl: NavController,
    public params: NavParams,
    public localDataService: LocalDataServiceProvider,
    private popoverCtrl: PopoverController,
    private changeDetector: ChangeDetectorRef,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController) {

    this.quote = params.get('quote');

    this.quotes_total = 0;
    this.loaddata();
    
  }

  loaddata() {

    if(!this.quote || !this.quote.Id){
      return;
    }

    console.log('ProductSummary quoteId '+this.quote.Id);

    let loading = this.loadingCtrl.create({
    content: '<div >Loading..</div><div>This may take a few minutes..</div>'
    });
    loading.present();

    this.localDataService.getQuoteProducts(this.quote.Id)
     .then(data => {

       this.quotelines = data;
       console.log(this.quotelines);
       let total = 0;
       for (let quoteline of this.quotelines){
         total += parseFloat(quoteline.BaseListPrice);
       }

       this.quotes_total = total;

       loading.dismiss();      
     });

    this.localDataService.getSettings()
       .then(data => {

         this.settings = data;
         this.disable = (this.settings.onlineMode)? null: true;
       });

  }

  doGoToProposal(){
    this.doAction('UI Action - goToProposal');
  }

  doGoToBOM(){
    this.doAction('UI Action - goToBOM');
  }

  doRefresh(){

    //TODO - Refresh from dynamic data... at the moment is it just a sample

    let loading = this.loadingCtrl.create({
    content: '<div>Loading..</div><div>This may take a few minutes..</div>'
    });
    loading.present();

    setTimeout(() => {
    loading.dismiss();
  }, 2000);
  }

  doAddProduct(){
    this.navCtrl.push(AddProduct, {
      quote: this.quote
    });
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

  showPopover(ev, objectInstance) {

      let popover = this.popoverCtrl.create(PopoverComponent, { 
          settings: this.settings, 
          objectType: 'quoteline',
          objectInstance: objectInstance,
          mainCtrl: this.navCtrl
        },{cssClass:'popover-more'});
      popover.present({ ev: ev });
      popover.onDidDismiss((data) => {

        this.loaddata();

      });

  } 

  
}
