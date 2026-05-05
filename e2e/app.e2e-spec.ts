import { ConstrutorIATemplatePage } from './app.po';

describe('ConstrutorIA App', function () {
    let page: ConstrutorIATemplatePage;

    beforeEach(() => {
        page = new ConstrutorIATemplatePage();
    });

    it('should display message saying app works', () => {
        page.navigateTo();
        expect(page.getParagraphText()).toEqual('app works!');
    });
});

