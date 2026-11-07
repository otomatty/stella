public class Q08IsPositiveTests
{
    [Fact(DisplayName = "Q08 正の数か")]
    public void Q08IsPositive()
    {
        Assert.Equal(true, Answers.Q08IsPositive(8));
        Assert.Equal(false, Answers.Q08IsPositive(0));
        Assert.Equal(false, Answers.Q08IsPositive(-3));
    }
}
