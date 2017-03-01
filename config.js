function Config() {
    Object.call(this);
    this.game_time = 60000;

    this.enter_rectangle = 20;
    this.ship_death_penalty = 100;

    this.ship_explode_duration = 1000;

    this.max_points = 3000;
    this.max_bonus = 60;
    this.min_angle = 30;
    this.max_angle = 150;
    //this.stars = true;

    this.staircase = true;
    this.rect_width = 200;
    this.staircase_delta = 15;
    this.staircase_decrease_threshold = 1; //Decrease half_width if deaths exceed this
    this.staircase_increase_threshold = 1; //Increase half_width if deaths exceed this
    this.min_rect_width = 50;
    this.survey_rect_width = 90;

    this.num_games = 20;

    return this;
}

function RectangleConfig() {
  Config.call(this);
}
