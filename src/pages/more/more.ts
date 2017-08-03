import { Component } from '@angular/core';
import { NavController, PopoverController, NavParams, App } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';

import { SelectAccountPage } from "./select-account/select-account";
import { SelectCatalogPage } from "./select-catalog/select-catalog";
import { Login } from '../login/login';

@Component({
    selector: 'more-page',
    templateUrl: 'more.html'
})
export class MorePage {

    constructor(public navCtrl: NavController,
        public params: NavParams,
        public localDataService: LocalDataServiceProvider,
        private popoverCtrl: PopoverController,
        private appCtrl: App ) {

        this.loaddata();
    }

    loaddata() {

    }

    showPopover(ev) {
        console.log('show popover');
        /*let popover = this.popoverCtrl.create(Popover, {
            onlineMode: this.on_off.onlineMode,
            objectType: 'opportunity'
        },
            { cssClass: 'popover-more' });
        popover.present({
            ev: ev
        }); */
    }

    navigate(val) {

        if(!val) return;

        let page: any;
        switch(val){
            case 'accounts':    page = SelectAccountPage; break;
            case 'catalogs':    page = SelectCatalogPage; break;
        }

        this.navCtrl.push(page, {});
    }

    doLogout() {
        alert('Logging Out');

        this.localDataService.logoutUser();
        //CALLS BACK THE LOGIN PAGE WITHOUT TABS BAR
        this.appCtrl.getRootNav().setRoot(Login);
    }
}


