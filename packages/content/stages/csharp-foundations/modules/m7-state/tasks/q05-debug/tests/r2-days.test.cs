public class R2DaysTests
{
    [Fact(DisplayName = "R2 t以上までの回数")]
    public void R2Days()
    {
        Assert.Equal(0, Answers.R2Days(5, 5, 1));
        Assert.Equal(1, Answers.R2Days(4, 5, 1));
        Assert.Equal(2, Answers.R2Days(0, 10, 5));
        Assert.Equal(0, Answers.R2Days(0, 0, 1));
    }
}
