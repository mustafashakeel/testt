import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController, PopoverController, NavParams, LoadingController } from 'ionic-angular';
import { LocalDataServiceProvider } from "../../../providers/local-data-service/local-data-service";
import { PopoverComponent } from '../../../components/popover.component';
import { Filter } from "../../../components/filter.component";

@Component({
    selector: 'select-catalog',
    templateUrl: 'select-catalog.html'
})
export class SelectCatalogPage {
    changeDetector: any;
    quotes: any;
    settings: any;

    public catalogs: any;
    public filterOptionValues: any;
    public isLoading: boolean;

    constructor(public navCtrl: NavController,
        public params: NavParams,
        public localDataService: LocalDataServiceProvider,
        private popoverCtrl: PopoverController, 
        private filterCtrl: PopoverController,
        private loadingCtrl: LoadingController) {

        this.loaddata();

    }

    loaddata() {

      this.isLoading = true;
      this.localDataService.getSettings().then(data => {
          this.settings = data;
      });

      this.localDataService.getCatalogs().then(data => {
        this.catalogs = data;
        this.isLoading = false;
      })
    }

    showPopover(ev, objectInstance) {

        let popover = this.popoverCtrl.create(PopoverComponent, { 
            settings: this.settings, 
            objectType: 'catalog',
            objectInstance: objectInstance,
            mainCtrl: this.navCtrl
          },{cssClass:'popover-more'});
        popover.present({ ev: ev });
        popover.onDidDismiss((data) => {

          this.loaddata();

        });

    } 

    showFilter(ev) {
         let filter = this.popoverCtrl.create(Filter);
         filter.present({
           ev: ev
         });
     
         let _that = this;
     
         filter.onDidDismiss((data) => {
     
           //_that.localDataService.updateQuoteFilterOptions(data);
     
           let newOptions = {
             filterOptionValues: data,
             isOnline: this.settings.onlineMode
           };
     
           //show loading bar while loading
           //let loading = this.loadingCtrl.create();
           //loading.present();
           this.isLoading = true;

           // reload quotes with new params
           _that.localDataService.getQuotes(newOptions)
             .then(newQuotes => {
     
               this.quotes = newQuotes;
               this.changeDetector.detectChanges();
               //loading.dismiss();
               this.isLoading = false;
     
             });
     
         }); 
    }

    /*
    navigate(catalog) {
        this.navCtrl.push(CatalogSummaryPage, {
          'catalog': catalog
        });
    }
    */

}
