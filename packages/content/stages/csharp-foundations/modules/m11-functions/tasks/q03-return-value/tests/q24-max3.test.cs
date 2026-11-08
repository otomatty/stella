public class Q24Max3Tests
{
    [Fact(DisplayName = "Q24 3つの最大")]
    public void Q24Max3()
    {
        Assert.Equal(9, Answers.Q24Max3(3, 9, 4));
        Assert.Equal(1, Answers.Q24Max3(1, 1, 1));
        Assert.Equal(9, Answers.Q24Max3(9, 1, 2));
        Assert.Equal(9, Answers.Q24Max3(1, 2, 9));
    }
}
