public class Q01IsEvenTests
{
    [Fact(DisplayName = "Q01 偶数か")]
    public void Q01IsEven()
    {
        Assert.Equal(false, Answers.Q01IsEven(7));
        Assert.Equal(true, Answers.Q01IsEven(8));
        Assert.Equal(true, Answers.Q01IsEven(0));
    }
}
