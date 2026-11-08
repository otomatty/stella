public class Q21Max2Tests
{
    [Fact(DisplayName = "Q21 大きい方")]
    public void Q21Max2()
    {
        Assert.Equal(10, Answers.Q21Max2(3, 10));
        Assert.Equal(10, Answers.Q21Max2(10, 3));
        Assert.Equal(4, Answers.Q21Max2(4, 4));
    }
}
