public class Q09IsZeroTests
{
    [Fact(DisplayName = "Q09 0か")]
    public void Q09IsZero()
    {
        Assert.Equal(true, Answers.Q09IsZero(0));
        Assert.Equal(false, Answers.Q09IsZero(1));
        Assert.Equal(false, Answers.Q09IsZero(-1));
    }
}
