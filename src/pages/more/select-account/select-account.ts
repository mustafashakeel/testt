import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController, PopoverController, NavParams, LoadingController } from 'ionic-angular';
import { LocalDataServiceProvider } from "../../../providers/local-data-service/local-data-service";
import { AccountSummaryPage } from "../account-summary/account-summary";
import { PopoverComponent } from '../../../components/popover.component';
import { Filter } from "../../../components/filter.component";

@Component({
    selector: 'select-account',
    templateUrl: 'select-account.html'
})
export class SelectAccountPage {
    changeDetector: any;
    quotes: any;
    settings: any;

    public accounts: any;
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

      this.localDataService.getAccounts().then(data => {
        this.accounts = data;
        this.isLoading = false;
      })
    }

    showPopover(ev, objectInstance) {

        let popover = this.popoverCtrl.create(PopoverComponent, { 
            settings: this.settings, 
            objectType: 'account',
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
           let loading = this.loadingCtrl.create();
           loading.present();
     
           // reload quotes with new params
           _that.localDataService.getQuotes(newOptions)
             .then(newQuotes => {
     
               this.quotes = newQuotes;
               this.changeDetector.detectChanges();
               loading.dismiss();
     
             });
     
         }); 
    }

    navigate(account) {
        this.navCtrl.push(AccountSummaryPage, {
          'account': account
        });
    }

}
