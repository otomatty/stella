public class Q02IsOddTests
{
    [Fact(DisplayName = "Q02 奇数か")]
    public void Q02IsOdd()
    {
        Assert.Equal(true, Answers.Q02IsOdd(7));
        Assert.Equal(false, Answers.Q02IsOdd(8));
        Assert.Equal(false, Answers.Q02IsOdd(0));
    }
}
