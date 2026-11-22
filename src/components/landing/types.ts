/**
 * What every landing section may ask the page to do. LandingPage builds it
 * from the auth logic of the old page and passes it to all eight sections.
 *
 * - register: a signed-in learner goes to /dashboard; anyone else gets QuickRegisterModal.
 * - login: a signed-in learner goes to /dashboard; anyone else gets QuickLoginModal.
 * - protectedGo: a signed-in learner goes to `route`; anyone else gets
 *   AuthGateModal, which names `label` ("bài đánh giá đầu vào").
 */
export type LandingActions = {
  register: () => void;
  login: () => void;
  protectedGo: (label: string, route: string) => void;
};
